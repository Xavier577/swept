package cleaner_test

import (
	"context"
	"path/filepath"
	"testing"

	"swept/internal/cleaner"
)

func TestChangingAppearanceDuringAScanPreservesResultsAndFolderSettings(t *testing.T) {
	w := newWorkspace(t)
	put(t, w.home, "Projects/app/file", "keep")
	root := filepath.Join(w.home, "Projects")
	excluded := filepath.Join(w.home, "Private")
	if err := w.engine.SaveSettings(cleaner.Settings{Theme: "dark", ProjectRoots: []string{root}, ExcludedPaths: []string{excluded}}); err != nil {
		t.Fatal(err)
	}
	previous := scan(t, w, root)
	changed := false
	result, err := w.engine.Scan(context.Background(), "active", w.home, func(cleaner.Progress) {
		if !changed {
			if err := w.engine.SetTheme("light"); err != nil {
				t.Fatal(err)
			}
			changed = true
		}
	})
	if err != nil || result.Cancelled || !changed {
		t.Fatal("appearance change interrupted the active scan", err)
	}
	cached, err := w.engine.Browse(context.Background(), "back", root, nil)
	if err != nil || cached.ID != previous.ID {
		t.Fatal("appearance change discarded measured folders", err)
	}
	reopened, err := cleaner.New(w.home, w.state)
	if err != nil {
		t.Fatal(err)
	}
	status, err := reopened.Status()
	if err != nil {
		t.Fatal(err)
	}
	if status.Settings.Theme != "light" || len(status.Settings.ProjectRoots) != 1 || status.Settings.ProjectRoots[0] != root || len(status.Settings.ExcludedPaths) != 1 || status.Settings.ExcludedPaths[0] != excluded {
		t.Fatalf("appearance was not saved independently of folder settings: %+v", status.Settings)
	}
}
