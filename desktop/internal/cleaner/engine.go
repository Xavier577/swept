package cleaner

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"swept/internal/platform"
)

type savedState struct {
	Settings Settings  `json:"settings"`
	History  []Cleanup `json:"history"`
}
type Engine struct {
	reader        *directoryReader
	home          string
	statePath     string
	mu            sync.Mutex
	state         savedState
	scans         map[string]map[string]snapshot
	catalogScanID string
	folderScans   map[string]Scan
	folderOrder   []string
	cancel        context.CancelFunc
	jobID         string
}

func newID() string { return rand.Text() }
func New(home, stateDir string) (*Engine, error) {
	home, err := filepath.EvalSymlinks(home)
	if err != nil {
		return nil, err
	}
	e := &Engine{reader: newDirectoryReader(os.ReadDir), home: home, statePath: filepath.Join(stateDir, "state.json"), scans: make(map[string]map[string]snapshot), folderScans: make(map[string]Scan)}
	e.state.Settings = Settings{ProjectRoots: []string{}, ExcludedPaths: []string{}, Theme: "system"}
	e.state.History = []Cleanup{}
	for _, name := range []string{"Developer", "Projects", "Code"} {
		p := filepath.Join(home, name)
		if exists(p) {
			e.state.Settings.ProjectRoots = append(e.state.Settings.ProjectRoots, p)
		}
	}
	data, err := os.ReadFile(e.statePath)
	if err == nil {
		if err = json.Unmarshal(data, &e.state); err != nil {
			return nil, fmt.Errorf("read Swept settings: %w", err)
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}
	return e, nil
}
func (e *Engine) settingsCopy() Settings {
	e.mu.Lock()
	defer e.mu.Unlock()
	s := e.state.Settings
	s.ProjectRoots = append([]string{}, s.ProjectRoots...)
	s.ExcludedPaths = append([]string{}, s.ExcludedPaths...)
	return s
}
func (e *Engine) begin(ctx context.Context, id string) (context.Context, func(), error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.cancel != nil {
		return nil, nil, errors.New("another scan or cleanup is running")
	}
	ctx, cancel := context.WithCancel(ctx)
	e.cancel = cancel
	e.jobID = id
	return ctx, func() { cancel(); e.mu.Lock(); e.cancel = nil; e.jobID = ""; e.mu.Unlock() }, nil
}
func (e *Engine) Cancel(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.jobID == id && e.cancel != nil {
		e.cancel()
	}
}
func (e *Engine) Status() (Status, error) {
	total, available, err := platform.DiskSpace(e.home)
	if err != nil {
		return Status{}, err
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	return Status{Home: e.home, Disk: Disk{total, available}, Settings: e.state.Settings, History: e.state.History, PermissionHint: "Swept scans accessible folders. If a scan reports permission errors, enable Swept in System Settings → Privacy & Security → Full Disk Access, then quit and reopen the app."}, nil
}
func (e *Engine) SaveSettings(settings Settings) error {
	if settings.Theme != "system" && settings.Theme != "light" && settings.Theme != "dark" {
		return errors.New("invalid theme")
	}
	for _, path := range append(append([]string{}, settings.ProjectRoots...), settings.ExcludedPaths...) {
		if !filepath.IsAbs(path) || filepath.Clean(path) != path || !within(e.home, path) {
			return fmt.Errorf("choose a folder inside your home: %s", path)
		}
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.cancel != nil {
		return errors.New("wait for the current operation before changing scan settings")
	}
	previous := e.state.Settings
	e.state.Settings = settings
	if err := e.saveLocked(); err != nil {
		e.state.Settings = previous
		return err
	}
	e.invalidateScansLocked()
	return nil
}

// Appearance is independent of scan settings and must not invalidate results.
func (e *Engine) SetTheme(theme string) error {
	if theme != "system" && theme != "light" && theme != "dark" {
		return errors.New("invalid theme")
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	previous := e.state.Settings.Theme
	e.state.Settings.Theme = theme
	if err := e.saveLocked(); err != nil {
		e.state.Settings.Theme = previous
		return err
	}
	return nil
}

func (e *Engine) saveLocked() error {
	if err := os.MkdirAll(filepath.Dir(e.statePath), 0700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(e.state, "", "  ")
	if err != nil {
		return err
	}
	tmp := e.statePath + ".tmp"
	if err = os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, e.statePath)
}
