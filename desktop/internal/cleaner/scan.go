package cleaner

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"syscall"
	"time"
)

type measurement struct {
	bytes, logical, files int64
	digest                [32]byte
	incomplete            bool
}
type snapshot struct {
	item   Item
	info   os.FileInfo
	digest [32]byte
}
type scanRun struct {
	home             string
	id               string
	exclusions       []string
	warnings         []string
	skipped          []string
	skippedCount     int
	permissionDenied bool
	warningCount     int
	visited          int64
	items            int
	lastProgress     time.Time
	emit             func(Progress)
	reader           *directoryReader
}

func (r *scanRun) excluded(path string) bool {
	for _, excluded := range r.exclusions {
		if within(excluded, path) {
			return true
		}
	}
	return false
}
func (r *scanRun) warn(path string, err error) {
	var skipped *skippedLocation
	if errors.As(err, &skipped) {
		r.skip(skipped.path, skipped.reason)
		return
	}
	if errors.Is(err, fs.ErrPermission) || errors.Is(err, syscall.EPERM) {
		r.permissionDenied = true
	}
	r.warningCount++
	if len(r.warnings) < 40 {
		r.warnings = append(r.warnings, fmt.Sprintf("%s: %v", path, err))
	}
}
func (r *scanRun) skip(path, reason string) {
	r.skippedCount++
	if len(r.skipped) < 40 {
		r.skipped = append(r.skipped, path+": "+reason)
	}
}
func (r *scanRun) progress(phase, path string) {
	r.visited++
	if r.emit == nil || time.Since(r.lastProgress) < 100*time.Millisecond {
		return
	}
	r.lastProgress = time.Now()
	r.emit(Progress{r.id, phase, path, r.visited, r.items})
}

func (r *scanRun) measure(ctx context.Context, path string) (measurement, error) {
	var result measurement
	if err := noSymlinkComponents(r.home, path); err != nil {
		return result, err
	}
	rootInfo, err := os.Lstat(path)
	if err != nil {
		return result, err
	}
	device := rootInfo.Sys().(*syscall.Stat_t).Dev
	hash := sha256.New()
	seen := make(map[[2]uint64]bool)
	err = r.reader.walk(ctx, path, func(current string, entry fs.DirEntry, walkErr error) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if walkErr != nil {
			r.warn(current, walkErr)
			result.incomplete = true
			return nil
		}
		if r.excluded(current) {
			r.skip(current, "Excluded in Preferences.")
			result.incomplete = true
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			r.warn(current, err)
			result.incomplete = true
			return nil
		}
		stat := info.Sys().(*syscall.Stat_t)
		if stat.Dev != device {
			result.incomplete = true
			r.skip(current, "Separate mounted filesystem; outside this scan.")
			if entry.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		rel, _ := filepath.Rel(path, current)
		fmt.Fprintf(hash, "%q:%d:%d:%d:%d:%d:%d\n", rel, stat.Dev, stat.Ino, info.Mode(), info.Size(), info.ModTime().UnixNano(), stat.Ctimespec.Nano())
		r.progress("Measuring files", current)
		if !info.Mode().IsRegular() {
			return nil
		}
		key := [2]uint64{uint64(stat.Dev), stat.Ino}
		if seen[key] {
			return nil
		}
		seen[key] = true
		result.bytes += stat.Blocks * 512
		result.logical += info.Size()
		result.files++
		return nil
	})
	copy(result.digest[:], hash.Sum(nil))
	return result, err
}

func (r *scanRun) inspect(ctx context.Context, c candidate) (snapshot, error) {
	info, err := os.Lstat(c.path)
	if err != nil {
		return snapshot{}, err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return snapshot{}, &skippedLocation{c.path, "Symbolic link; its destination is outside this scan."}
	}
	m, err := r.measure(ctx, c.path)
	if err != nil {
		return snapshot{}, err
	}
	item := Item{ID: newID(), Name: filepath.Base(c.path), Path: c.path, Category: c.category, Kind: c.kind, Risk: c.risk, Reason: c.reason, Bytes: m.bytes, LogicalBytes: m.logical, Files: m.files, Modified: info.ModTime(), Directory: info.IsDir(), CanClean: true}
	name := filepath.Base(c.path)
	if _, ok := browserCache(r.home, c.path); ok {
		if name == "Cache" || name == "Code Cache" || name == "cache2" {
			item.Name = c.kind + " / " + filepath.Base(filepath.Dir(c.path)) + " / " + name
		}
	}
	if (c.kind == "Dependencies" && name == "node_modules") || (c.kind == "Rust build output" && name == "target") || (c.kind == "Virtual environment" && (name == ".venv" || name == "venv")) {
		item.Name = filepath.Base(filepath.Dir(c.path)) + " / " + filepath.Base(c.path)
	}
	if err := validatePath(r.home, c.path); err != nil {
		item.CanClean = false
		item.BlockedReason = err.Error()
		item.BlockedLabel = "Protected file"
		if item.Directory {
			item.BlockedLabel = "Protected folder"
		}
	}
	if c.kind == "Conda cache" {
		item.CanClean = false
		item.BlockedLabel = "Use Conda"
		item.BlockedReason = "Use conda clean to preserve environment links."
	}
	if m.incomplete && item.CanClean {
		item.BlockedLabel = "Partially measured"
		item.CanClean = false
		item.BlockedReason = "Some contents were skipped or could not be read. Open this folder to review individual items."
	}
	return snapshot{item, info, m.digest}, nil
}

func (e *Engine) Scan(ctx context.Context, jobID, path string, emit func(Progress)) (Scan, error) {
	ctx, done, err := e.begin(ctx, jobID)
	if err != nil {
		return Scan{}, err
	}
	defer done()
	settings := e.settingsCopy()
	r := &scanRun{reader: e.reader, home: e.home, id: jobID, exclusions: settings.ExcludedPaths, warnings: []string{}, skipped: []string{}, emit: emit}
	result := Scan{ID: newID(), Path: path, Started: time.Now(), Items: []Item{}}
	if ctx.Err() != nil {
		result.Cancelled = true
		result.Finished = time.Now()
		return result, nil
	}
	var candidates []candidate
	if path == "" {
		candidates = r.discover(ctx, settings)
	} else {
		path = filepath.Clean(path)
		result.Path = path
		if err := noSymlinkComponents(e.home, path); err != nil {
			var skipped *skippedLocation
			if errors.As(err, &skipped) {
				result.Skipped = []string{skipped.Error()}
				result.SkippedCount = 1
				result.Warnings = []string{}
				result.Finished = time.Now()
				e.rememberScan(result, make(map[string]snapshot))
				return result, nil
			}
			return result, err
		}
		entries, err := r.reader.read(ctx, path)
		if err != nil {
			if ctx.Err() != nil {
				result.Cancelled = true
				result.Finished = time.Now()
				return result, nil
			}
			return result, err
		}
		for _, entry := range entries {
			if ctx.Err() != nil {
				break
			}
			p := filepath.Join(path, entry.Name())
			if entry.Type()&os.ModeSymlink != 0 {
				r.skip(p, "Symbolic link; its destination is outside this scan.")
				continue
			}
			if r.excluded(p) {
				r.skip(p, "Excluded in Preferences.")
				continue
			}
			candidates = append(candidates, r.classify(p))
		}
	}
	snapshots := make(map[string]snapshot)
	for _, c := range candidates {
		if ctx.Err() != nil {
			result.Cancelled = true
			break
		}
		s, err := r.inspect(ctx, c)
		if err != nil {
			if ctx.Err() != nil {
				result.Cancelled = true
				break
			}
			r.warn(c.path, err)
			continue
		}
		if path == "" && s.item.Bytes == 0 {
			continue
		}
		result.Items = append(result.Items, s.item)
		snapshots[s.item.ID] = s
		r.items++
	}
	result.Cancelled = result.Cancelled || ctx.Err() != nil
	sort.Slice(result.Items, func(i, j int) bool {
		if result.Items[i].Bytes == result.Items[j].Bytes {
			return result.Items[i].Path < result.Items[j].Path
		}
		return result.Items[i].Bytes > result.Items[j].Bytes
	})
	result.Finished = time.Now()
	result.Warnings = r.warnings
	result.WarningCount = r.warningCount
	result.Skipped = r.skipped
	result.SkippedCount = r.skippedCount
	result.PermissionDenied = r.permissionDenied
	if !result.Cancelled {
		e.rememberScan(result, snapshots)
	}
	return result, nil
}

// Browse reuses measurements for navigation. Scan explicitly refreshes them.
func (e *Engine) Browse(ctx context.Context, jobID, path string, emit func(Progress)) (Scan, error) {
	path = filepath.Clean(path)
	e.mu.Lock()
	if e.cancel != nil {
		e.mu.Unlock()
		return Scan{}, errors.New("another scan or cleanup is running")
	}
	if result, ok := e.folderScans[path]; ok {
		e.touchFolderLocked(path)
		e.mu.Unlock()
		return result, nil
	}
	e.mu.Unlock()
	return e.Scan(ctx, jobID, path, emit)
}

func (e *Engine) touchFolderLocked(path string) {
	for index, entry := range e.folderOrder {
		if entry == path {
			e.folderOrder = append(e.folderOrder[:index], e.folderOrder[index+1:]...)
			break
		}
	}
	e.folderOrder = append(e.folderOrder, path)
}

func (e *Engine) rememberScan(result Scan, snapshots map[string]snapshot) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if result.Path == "" {
		delete(e.scans, e.catalogScanID)
		e.catalogScanID = result.ID
	} else {
		delete(e.scans, e.folderScans[result.Path].ID)
		e.folderScans[result.Path] = result
		e.touchFolderLocked(result.Path)
		// Bound session memory while keeping the developer sweep independent of navigation.
		if len(e.folderOrder) > 32 {
			oldest := e.folderOrder[0]
			delete(e.scans, e.folderScans[oldest].ID)
			delete(e.folderScans, oldest)
			e.folderOrder = e.folderOrder[1:]
		}
	}
	e.scans[result.ID] = snapshots
}

func (e *Engine) invalidateScansLocked() {
	e.scans = make(map[string]map[string]snapshot)
	e.folderScans = make(map[string]Scan)
	e.folderOrder = nil
	e.catalogScanID = ""
}

// Tool-managed cleanup can change files represented by any cached folder.
func (e *Engine) InvalidateScans() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.invalidateScansLocked()
}
