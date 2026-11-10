package cleaner

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"swept/internal/platform"
)

// Cleanup accepts opaque IDs from a completed scan, never paths from the UI.
func (e *Engine) Cleanup(ctx context.Context, scanID string, ids []string, mode string, confirmed bool) (Cleanup, error) {
	if !confirmed {
		return Cleanup{}, errors.New("review and confirm the selected items first")
	}
	if mode != "permanent" && mode != "trash" {
		return Cleanup{}, errors.New("invalid cleanup mode")
	}
	if len(ids) == 0 {
		return Cleanup{}, errors.New("select at least one item")
	}
	ctx, done, err := e.begin(ctx, "cleanup")
	if err != nil {
		return Cleanup{}, err
	}
	defer done()
	e.mu.Lock()
	snapshots, ok := e.scans[scanID]
	e.mu.Unlock()
	if !ok {
		return Cleanup{}, errors.New("this scan expired; scan again before cleaning")
	}
	selected := make([]snapshot, 0, len(ids))
	seen := make(map[string]bool)
	for _, id := range ids {
		s, ok := snapshots[id]
		if !ok {
			return Cleanup{}, errors.New("selection does not belong to this scan")
		}
		if !s.item.CanClean {
			return Cleanup{}, fmt.Errorf("%s: %s", s.item.Name, s.item.BlockedReason)
		}
		if !seen[id] {
			selected = append(selected, s)
			seen[id] = true
		}
	}
	sort.Slice(selected, func(i, j int) bool { return selected[i].item.Path < selected[j].item.Path })
	for i, current := range selected {
		for _, earlier := range selected[:i] {
			if within(earlier.item.Path, current.item.Path) {
				return Cleanup{}, errors.New("select a folder or its contents, not both")
			}
		}
	}
	_, before, diskErr := platform.DiskSpace(e.home)
	result := Cleanup{ID: newID(), At: time.Now(), Mode: mode, Items: []Outcome{}}
	r := &scanRun{reader: e.reader, home: e.home, exclusions: e.settingsCopy().ExcludedPaths}
	for _, s := range selected {
		outcome := Outcome{Path: s.item.Path}
		if err := e.cleanOne(ctx, r, s, mode); err != nil {
			outcome.Error = err.Error()
		} else {
			outcome.Bytes = s.item.Bytes
			result.RemovedBytes += outcome.Bytes
		}
		result.Items = append(result.Items, outcome)
	}
	_, after, afterErr := platform.DiskSpace(e.home)
	if diskErr == nil && afterErr == nil {
		result.AvailableChange = after - before
	} else {
		result.Warning = "Could not measure the change in free disk space."
	}
	e.mu.Lock()
	defer e.mu.Unlock()
	e.invalidateScansLocked()
	e.state.History = append([]Cleanup{result}, e.state.History...)
	if len(e.state.History) > 50 {
		e.state.History = e.state.History[:50]
	}
	if err := e.saveLocked(); err != nil {
		result.Warning += " Cleanup finished, but its history could not be saved: " + err.Error()
	}
	return result, nil
}
func (e *Engine) cleanOne(ctx context.Context, r *scanRun, s snapshot, mode string) error {
	path := s.item.Path
	if err := validatePath(e.home, path); err != nil {
		return err
	}
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if !os.SameFile(info, s.info) {
		return errors.New("item was replaced since the scan; scan again")
	}
	m, err := r.measure(ctx, path)
	if err != nil {
		return err
	}
	if m.incomplete || m.digest != s.digest {
		return errors.New("contents changed or became unreadable since the scan; scan again")
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if mode == "trash" {
		return platform.Trash(path)
	}
	// Open the parent and operate relative to its descriptor. Rename first, then
	// verify identity before removal so a replaced selection cannot be deleted.
	homeRoot, err := os.OpenRoot(e.home)
	if err != nil {
		return err
	}
	defer homeRoot.Close()
	relativeParent, err := filepath.Rel(e.home, filepath.Dir(path))
	if err != nil {
		return err
	}
	root, err := homeRoot.OpenRoot(relativeParent)
	if err != nil {
		return err
	}
	defer root.Close()
	base := filepath.Base(path)
	staged := ".swept-cleaning-" + newID()
	if err = root.Rename(base, staged); err != nil {
		return err
	}
	stagedInfo, err := root.Lstat(staged)
	if err != nil || !os.SameFile(stagedInfo, s.info) {
		if restoreErr := restoreStaged(root, staged, base); restoreErr != nil {
			return fmt.Errorf("item changed; restore %s manually: %w", filepath.Join(filepath.Dir(path), staged), restoreErr)
		}
		return errors.New("item changed during cleanup; scan again")
	}
	if err = root.RemoveAll(staged); err != nil {
		if restoreErr := restoreStaged(root, staged, base); restoreErr != nil {
			return fmt.Errorf("partial cleanup; remaining files at %s: %w", filepath.Join(filepath.Dir(path), staged), err)
		}
		return fmt.Errorf("partial cleanup; some files could not be removed: %w", err)
	}
	return nil
}

// Never overwrite a file recreated by another process while recovering a partial cleanup.
func restoreStaged(root *os.Root, staged, original string) error {
	if _, err := root.Lstat(original); !os.IsNotExist(err) {
		return errors.New("the original name is occupied; staged contents were preserved")
	}
	return root.Rename(staged, original)
}
