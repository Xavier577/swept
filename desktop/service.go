package main

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"sync/atomic"

	"swept/internal/cleaner"
	"swept/internal/managed"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Service is the desktop boundary. Filesystem policy lives in cleaner; Vue only
// receives serializable models and opaque identifiers for reviewed selections.
type Service struct {
	engine     *cleaner.Engine
	managed    *managed.Manager
	app        *application.App
	operation  sync.Mutex
	cleaning   atomic.Bool
	scanMu     sync.Mutex
	scanJob    string
	scanCancel context.CancelFunc
	notify     func(string, any)
}

func (s *Service) Status() (cleaner.Status, error) { return s.engine.Status() }
func (s *Service) Scan(jobID, path string) error {
	return s.startScan(jobID, path, true)
}
func (s *Service) Browse(jobID, path string) error {
	return s.startScan(jobID, path, false)
}
func (s *Service) Cancel(jobID string) {
	s.scanMu.Lock()
	defer s.scanMu.Unlock()
	if s.scanJob == jobID && s.scanCancel != nil {
		s.scanCancel()
	}
}
func (s *Service) Cleanup(scanID string, ids []string, mode string, confirmed bool) (cleaner.Cleanup, error) {
	if !s.operation.TryLock() {
		return cleaner.Cleanup{}, errors.New("another operation is running")
	}
	defer s.operation.Unlock()
	s.cleaning.Store(true)
	defer s.cleaning.Store(false)
	return s.engine.Cleanup(context.Background(), scanID, ids, mode, confirmed)
}
func (s *Service) SaveSettings(settings cleaner.Settings) error {
	if !s.operation.TryLock() {
		return errors.New("wait for the current operation before changing preferences")
	}
	defer s.operation.Unlock()
	return s.engine.SaveSettings(settings)
}
func (s *Service) SetTheme(theme string) error { return s.engine.SetTheme(theme) }
func (s *Service) ChooseFolder() (string, error) {
	return s.app.Dialog.OpenFile().CanChooseDirectories(true).CanChooseFiles(false).SetTitle("Choose a folder inside your home").PromptForSingleSelection()
}
func (s *Service) Reveal(path string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	rel, err := filepath.Rel(home, path)
	if err != nil || !filepath.IsLocal(rel) {
		return errors.New("choose an item inside your home")
	}
	return exec.Command("/usr/bin/open", "-R", path).Run()
}
func (s *Service) OpenPermissions() error {
	return exec.Command("/usr/bin/open", "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles").Run()
}
func (s *Service) InspectTool(tool string) (managed.Report, error) {
	if !s.operation.TryLock() {
		return managed.Report{}, errors.New("another operation is running")
	}
	defer s.operation.Unlock()
	return s.managed.Inspect(context.Background(), tool)
}
func (s *Service) RunTool(reportID string, actionIDs []string, confirmation string) (managed.Result, error) {
	if !s.operation.TryLock() {
		return managed.Result{}, errors.New("another operation is running")
	}
	defer s.operation.Unlock()
	s.cleaning.Store(true)
	defer s.cleaning.Store(false)
	result, err := s.managed.Execute(context.Background(), reportID, actionIDs, confirmation)
	if err == nil {
		s.engine.InvalidateScans()
	}
	return result, err
}

// DockerStorage measures host files without contacting or starting a Docker engine.
func (s *Service) DockerStorage() (managed.StorageReport, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return managed.StorageReport{}, err
	}
	return managed.ReadStorage(home), nil
}
