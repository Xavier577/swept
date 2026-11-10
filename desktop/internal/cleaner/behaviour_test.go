package cleaner_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"

	"swept/internal/cleaner"
)

type workspace struct {
	home, state string
	engine      *cleaner.Engine
}

func newWorkspace(t *testing.T) workspace {
	t.Helper()
	home, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	state := t.TempDir()
	engine, err := cleaner.New(home, state)
	if err != nil {
		t.Fatal(err)
	}
	return workspace{home, state, engine}
}
func put(t *testing.T, home, name, contents string) string {
	t.Helper()
	path := filepath.Join(home, name)
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(contents), 0600); err != nil {
		t.Fatal(err)
	}
	return path
}
func scan(t *testing.T, w workspace, path string) cleaner.Scan {
	t.Helper()
	result, err := w.engine.Scan(context.Background(), "test-scan", path, nil)
	if err != nil {
		t.Fatal(err)
	}
	return result
}
func find(t *testing.T, result cleaner.Scan, path string) cleaner.Item {
	t.Helper()
	for _, item := range result.Items {
		if item.Path == path {
			return item
		}
	}
	t.Fatalf("scan did not find %s", path)
	return cleaner.Item{}
}
func assertContents(t *testing.T, path, expected string) {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil || string(data) != expected {
		t.Fatalf("expected %s to remain unchanged: data=%q err=%v", path, data, err)
	}
}

func TestDeveloperScanFindsRealArtifactsWithoutDoubleCountingNestedDependencies(t *testing.T) {
	w := newWorkspace(t)
	put(t, w.home, "Developer/app/package.json", "{}")
	put(t, w.home, "Developer/app/node_modules/pkg/node_modules/dependency/a/b/c/data", strings.Repeat("x", 8192))
	put(t, w.home, "Developer/app/src/main.ts", "valuable source")
	put(t, w.home, "Library/Caches/Homebrew/download", "package")
	put(t, w.home, "Library/Caches/Homebrew/project/node_modules/package/data", "nested cache")
	put(t, w.home, "Library/Caches/Homebrew-old/download", "older package")
	settings := cleaner.Settings{Theme: "system", ProjectRoots: []string{filepath.Join(w.home, "Developer"), filepath.Join(w.home, "Developer/app"), filepath.Join(w.home, "Library/Caches/Homebrew")}}
	if err := w.engine.SaveSettings(settings); err != nil {
		t.Fatal(err)
	}
	result := scan(t, w, "")
	if len(result.Items) != 3 {
		t.Fatalf("expected one dependency tree and two caches without counting the nested cache twice, got %+v", result.Items)
	}
	item := find(t, result, filepath.Join(w.home, "Developer/app/node_modules"))
	if item.LogicalBytes != 8192 || item.Files != 1 || !item.CanClean {
		t.Fatalf("incomplete artifact measurement: %+v", item)
	}
	if find(t, result, filepath.Join(w.home, "Library/Caches/Homebrew")).Category != "homebrew" {
		t.Fatal("Homebrew cache was misclassified")
	}
}

func TestScanSkipsKnownCacheLocationsRedirectedOutsideHome(t *testing.T) {
	w := newWorkspace(t)
	outside := t.TempDir()
	kept := put(t, outside, "_cacache/private", "outside data")
	if err := os.Symlink(outside, filepath.Join(w.home, ".npm")); err != nil {
		t.Fatal(err)
	}
	result := scan(t, w, "")
	if len(result.Items) != 0 || result.WarningCount != 0 || result.SkippedCount == 0 || result.PermissionDenied {
		t.Fatalf("redirected cache must be informational without permission advice: %+v", result)
	}
	assertContents(t, kept, "outside data")
}

func TestExplorerMeasuresDeepFilesAndSparseFilesWithoutFollowingSymlinks(t *testing.T) {
	w := newWorkspace(t)
	path := put(t, w.home, "Downloads/bundle/a/b/c/d/data", "hello")
	if err := os.Link(path, filepath.Join(filepath.Dir(path), "hardlink")); err != nil {
		t.Fatal(err)
	}
	outside := put(t, t.TempDir(), "outside", "must remain outside")
	if err := os.Symlink(filepath.Dir(outside), filepath.Join(w.home, "Downloads/bundle/external")); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(filepath.Join(w.home, "Downloads/sparse"))
	if err != nil {
		t.Fatal(err)
	}
	if err = f.Truncate(1 << 30); err != nil {
		t.Fatal(err)
	}
	if err = f.Close(); err != nil {
		t.Fatal(err)
	}
	result := scan(t, w, filepath.Join(w.home, "Downloads"))
	bundle := find(t, result, filepath.Join(w.home, "Downloads/bundle"))
	if bundle.LogicalBytes != 5 || bundle.Files != 1 {
		t.Fatalf("links counted incorrectly: %+v", bundle)
	}
	sparse := find(t, result, filepath.Join(w.home, "Downloads/sparse"))
	info, _ := os.Stat(sparse.Path)
	allocated := info.Sys().(*syscall.Stat_t).Blocks * 512
	if sparse.Bytes != allocated || sparse.LogicalBytes != 1<<30 {
		t.Fatalf("sparse file size is wrong: %+v", sparse)
	}
	assertContents(t, outside, "must remain outside")
}

func TestPermanentCleanupRemovesOnlyReviewedFilesAndPersistsTheResult(t *testing.T) {
	w := newWorkspace(t)
	put(t, w.home, "Library/Caches/chosen/cache", "discard")
	kept := put(t, w.home, "Library/Caches/kept/cache", "keep")
	source := put(t, w.home, "Developer/app/source.go", "source")
	result := scan(t, w, "")
	item := find(t, result, filepath.Join(w.home, "Library/Caches/chosen"))
	cleanup, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID, item.ID}, "permanent", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(cleanup.Items) != 1 || cleanup.Items[0].Error != "" {
		t.Fatalf("cleanup failed: %+v", cleanup)
	}
	if _, err := os.Stat(item.Path); !os.IsNotExist(err) {
		t.Fatal("selected directory still exists")
	}
	assertContents(t, kept, "keep")
	assertContents(t, source, "source")
	reopened, err := cleaner.New(w.home, w.state)
	if err != nil {
		t.Fatal(err)
	}
	status, err := reopened.Status()
	if err != nil {
		t.Fatal(err)
	}
	if len(status.History) != 1 || status.History[0].RemovedBytes != item.Bytes {
		t.Fatalf("missing cleanup history: %+v", status.History)
	}
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true); err == nil {
		t.Fatal("completed scan was reusable")
	}
}

func TestChangedItemsFailIndividuallyWhileUnchangedSelectionsComplete(t *testing.T) {
	w := newWorkspace(t)
	changed := put(t, w.home, "Library/Caches/changed/nested/file", "before")
	put(t, w.home, "Library/Caches/unchanged/file", "discard")
	result := scan(t, w, "")
	if err := os.WriteFile(changed, []byte("after: new content"), 0600); err != nil {
		t.Fatal(err)
	}
	ids := []string{}
	for _, item := range result.Items {
		ids = append(ids, item.ID)
	}
	cleanup, err := w.engine.Cleanup(context.Background(), result.ID, ids, "permanent", true)
	if err != nil {
		t.Fatal(err)
	}
	failures := 0
	for _, item := range cleanup.Items {
		if item.Error != "" {
			failures++
		}
	}
	if failures != 1 {
		t.Fatalf("expected one reported failure: %+v", cleanup)
	}
	assertContents(t, changed, "after: new content")
	if _, err := os.Stat(filepath.Join(w.home, "Library/Caches/unchanged")); !os.IsNotExist(err) {
		t.Fatal("unchanged item was not cleaned")
	}
}

func TestCleanupRejectsUnreviewedProtectedAndReplacedTargets(t *testing.T) {
	w := newWorkspace(t)
	secret := put(t, w.home, ".ssh/id_test", "secret")
	cache := put(t, w.home, "Library/Caches/app/file", "cache")
	homeScan := scan(t, w, w.home)
	protected := find(t, homeScan, filepath.Join(w.home, ".ssh"))
	if protected.CanClean {
		t.Fatal("credentials were offered for cleanup")
	}
	if _, err := w.engine.Cleanup(context.Background(), homeScan.ID, []string{protected.ID}, "permanent", true); err == nil {
		t.Fatal("protected cleanup accepted")
	}
	result := scan(t, w, "")
	item := find(t, result, filepath.Dir(cache))
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", false); err == nil {
		t.Fatal("unconfirmed cleanup accepted")
	}
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{"forged-id"}, "permanent", true); err == nil {
		t.Fatal("forged selection accepted")
	}
	if err := os.Rename(item.Path, item.Path+"-original"); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join(w.home, ".ssh"), item.Path); err != nil {
		t.Fatal(err)
	}
	cleanup, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true)
	if err != nil || cleanup.Items[0].Error == "" {
		t.Fatalf("replaced target was not rejected: %+v %v", cleanup, err)
	}
	assertContents(t, secret, "secret")
	assertContents(t, filepath.Join(item.Path+"-original", "file"), "cache")
}

func TestExclusionsPreventDeletingAParentThatContainsExcludedContent(t *testing.T) {
	w := newWorkspace(t)
	kept := put(t, w.home, "Library/Caches/app/important/file", "keep")
	put(t, w.home, "Library/Caches/app/temporary", "discard")
	if err := w.engine.SaveSettings(cleaner.Settings{Theme: "light", ExcludedPaths: []string{filepath.Dir(kept)}}); err != nil {
		t.Fatal(err)
	}
	result := scan(t, w, "")
	item := find(t, result, filepath.Join(w.home, "Library/Caches/app"))
	if result.WarningCount != 0 || result.SkippedCount != 1 || result.PermissionDenied {
		t.Fatalf("exclusion reported as a failure: %+v", result)
	}
	if item.CanClean {
		t.Fatal("parent of excluded content was offered for cleanup")
	}
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true); err == nil {
		t.Fatal("excluded content could be deleted")
	}
	assertContents(t, kept, "keep")
}

func TestCancelledScansCannotAuthorizeCleanupAndDoNotBlockTheNextScan(t *testing.T) {
	w := newWorkspace(t)
	put(t, w.home, "Library/Caches/app/file", "keep")
	result, err := w.engine.Scan(context.Background(), "cancel-me", "", func(cleaner.Progress) { w.engine.Cancel("cancel-me") })
	if err != nil || !result.Cancelled {
		t.Fatalf("scan did not cancel: %+v %v", result, err)
	}
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{"anything"}, "permanent", true); err == nil {
		t.Fatal("cancelled scan authorized cleanup")
	}
	if next := scan(t, w, ""); next.Cancelled || len(next.Items) != 1 {
		t.Fatalf("next scan failed: %+v", next)
	}
}

func TestUnreadableContentsRemainBlockedAndReportPermissionHelp(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("root bypasses directory permissions")
	}
	w := newWorkspace(t)
	kept := put(t, w.home, "Library/Caches/app/private/file", "keep")
	put(t, w.home, "Library/Caches/app/readable", "readable")
	dir := filepath.Dir(kept)
	if err := os.Chmod(dir, 0); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.Chmod(dir, 0700) })
	result := scan(t, w, "")
	item := find(t, result, filepath.Join(w.home, "Library/Caches/app"))
	if result.WarningCount != 1 || !result.PermissionDenied || item.CanClean {
		t.Fatalf("unreadable contents were misreported: %+v %+v", result, item)
	}
	if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true); err == nil {
		t.Fatal("unreadable folder cleanup accepted")
	}
}

func TestCombinedSweepSurvivesBrowsingAndRemovesOnlySelectedCategories(t *testing.T) {
	w := newWorkspace(t)
	node := put(t, w.home, ".npm/_cacache/package", "rebuildable package")
	logs := put(t, w.home, "Library/Logs/disposable/log", "old log")
	kept := put(t, w.home, "Library/Caches/kept/file", "keep")
	put(t, w.home, "Downloads/nested/file", "personal")
	result := scan(t, w, "")
	ids := []string{find(t, result, filepath.Dir(node)).ID, find(t, result, filepath.Dir(logs)).ID}
	// Folder navigation must not expire a pending cross-category review.
	for i := 0; i < 10; i++ {
		scan(t, w, filepath.Join(w.home, "Downloads"))
	}
	cleanup, err := w.engine.Cleanup(context.Background(), result.ID, ids, "permanent", true)
	if err != nil {
		t.Fatal(err)
	}
	if len(cleanup.Items) != 2 {
		t.Fatalf("wrong cleanup scope: %+v", cleanup)
	}
	for _, outcome := range cleanup.Items {
		if outcome.Error != "" {
			t.Fatal(outcome.Error)
		}
	}
	for _, path := range []string{node, logs} {
		if _, err := os.Stat(path); !os.IsNotExist(err) {
			t.Fatalf("selected item remains: %s", path)
		}
	}
	assertContents(t, kept, "keep")
}

func TestExplorerReportsMountedFilesystemAsAnExpectedSkip(t *testing.T) {
	root, err := os.Stat("/")
	if err != nil {
		t.Fatal(err)
	}
	mounted, err := os.Stat("/dev")
	if err != nil {
		t.Fatal(err)
	}
	if root.Sys().(*syscall.Stat_t).Dev == mounted.Sys().(*syscall.Stat_t).Dev {
		t.Skip("no separate /dev mount")
	}
	engine, err := cleaner.New("/", t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	result, err := engine.Scan(context.Background(), "mounted", "/dev", nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Items) != 0 || result.SkippedCount != 1 || result.WarningCount != 0 || result.PermissionDenied {
		t.Fatalf("mounted filesystem should be skipped without an access warning: %+v", result)
	}
}

func TestFolderNavigationReusesMeasurementsUntilExplicitRefresh(t *testing.T) {
	w := newWorkspace(t)
	file := put(t, w.home, "Downloads/project/output", "before")
	browse := func(path string) cleaner.Scan {
		t.Helper()
		result, err := w.engine.Browse(context.Background(), "browse", path, nil)
		if err != nil {
			t.Fatal(err)
		}
		return result
	}
	home := browse(w.home)
	downloads := browse(filepath.Join(w.home, "Downloads"))
	if err := os.WriteFile(file, []byte("changed after measurement"), 0600); err != nil {
		t.Fatal(err)
	}
	for _, previous := range []cleaner.Scan{home, downloads, home} {
		progress := 0
		cached, err := w.engine.Browse(context.Background(), "back", previous.Path, func(cleaner.Progress) { progress++ })
		if err != nil {
			t.Fatal(err)
		}
		if cached.ID != previous.ID || progress != 0 {
			t.Fatalf("navigation rescanned %s: progress=%d", previous.Path, progress)
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	cancelled, err := w.engine.Scan(ctx, "cancelled-refresh", w.home, nil)
	if err != nil || !cancelled.Cancelled {
		t.Fatalf("expected cancelled refresh: %+v %v", cancelled, err)
	}
	if browse(w.home).ID != home.ID {
		t.Fatal("cancelled refresh discarded usable navigation results")
	}
	refreshed := scan(t, w, downloads.Path)
	project := find(t, refreshed, filepath.Dir(file))
	if refreshed.ID == downloads.ID || project.LogicalBytes != int64(len("changed after measurement")) {
		t.Fatalf("explicit refresh did not update measurements: %+v", refreshed)
	}
	if browse(downloads.Path).ID != refreshed.ID {
		t.Fatal("navigation did not reuse the refreshed result")
	}
	cleanup, err := w.engine.Cleanup(context.Background(), refreshed.ID, []string{project.ID}, "permanent", true)
	if err != nil || cleanup.Items[0].Error != "" {
		t.Fatalf("cleanup failed: %+v %v", cleanup, err)
	}
	after := browse(downloads.Path)
	if after.ID == refreshed.ID || len(after.Items) != 0 {
		t.Fatalf("deleted folder survived in the navigation cache: %+v", after)
	}
	if browse(w.home).ID == home.ID {
		t.Fatal("parent sizes were not invalidated after cleanup")
	}
}

func TestCachedExplorerResultsCannotDeleteFilesChangedSinceMeasurement(t *testing.T) {
	w := newWorkspace(t)
	file := put(t, w.home, "Downloads/file", "before")
	folder := filepath.Dir(file)
	original, err := w.engine.Browse(context.Background(), "first", folder, nil)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file, []byte("valuable new contents"), 0600); err != nil {
		t.Fatal(err)
	}
	cached, err := w.engine.Browse(context.Background(), "return", folder, nil)
	if err != nil || cached.ID != original.ID {
		t.Fatalf("expected cached navigation: %+v %v", cached, err)
	}
	result, err := w.engine.Cleanup(context.Background(), cached.ID, []string{find(t, cached, file).ID}, "permanent", true)
	if err != nil || result.Items[0].Error == "" {
		t.Fatalf("changed cached file was not refused: %+v %v", result, err)
	}
	assertContents(t, file, "valuable new contents")
}

func TestExplorerKeepsKnownArtifactClassificationsWithoutAnOverviewScan(t *testing.T) {
	w := newWorkspace(t)
	artifacts := []string{
		".npm/_cacache", "go/pkg/mod", ".cargo/registry", "Library/Caches/Homebrew", "Library/Caches/pip",
		"Library/Logs/tool", "Library/Developer/Xcode/DerivedData/app", "Library/Developer/Xcode/Archives/release",
		"miniconda3/pkgs", "Developer/web/node_modules", "Developer/web/.next", "Developer/rust/target",
		"Developer/python/.venv", "Developer/python/__pycache__",
	}
	for _, path := range artifacts {
		put(t, w.home, path+"/payload", "artifact")
	}
	put(t, w.home, "Developer/web/package.json", "{}")
	put(t, w.home, "Developer/rust/Cargo.toml", "[package]")
	put(t, w.home, "Developer/python/.venv/pyvenv.cfg", "home = python")
	if err := w.engine.SaveSettings(cleaner.Settings{Theme: "system", ProjectRoots: []string{filepath.Join(w.home, "Developer")}}); err != nil {
		t.Fatal(err)
	}
	explored := make(map[string]cleaner.Item)
	for _, relative := range artifacts {
		path := filepath.Join(w.home, relative)
		explored[path] = find(t, scan(t, w, filepath.Dir(path)), path)
	}
	overview := scan(t, w, "")
	for path, item := range explored {
		known := find(t, overview, path)
		if item.Category != known.Category || item.Kind != known.Kind || item.Risk != known.Risk || item.Reason != known.Reason || item.CanClean != known.CanClean {
			t.Errorf("explorer changed classification for %s: explorer=%+v overview=%+v", path, item, known)
		}
	}
	modules := explored[filepath.Join(w.home, "go/pkg/mod")]
	if modules.Risk != cleaner.Rebuildable || modules.Kind != "Go modules" {
		t.Fatalf("Go modules not recognized: %+v", modules)
	}
}

func TestExplorerInheritsArtifactRiskWithoutMisclassifyingParentsOrLookalikes(t *testing.T) {
	w := newWorkspace(t)
	cacheFile := put(t, w.home, "go/pkg/mod/example/package.go", "downloaded module")
	source := put(t, w.home, "go/src/myapp/main.go", "original source")
	put(t, w.home, "Downloads/target/data", "personal target folder")
	put(t, w.home, "Downloads/node_modules", "a file, not an artifact directory")
	put(t, w.home, ".npm/_cacache-backup/data", "unknown backup")
	condaFile := put(t, w.home, "miniconda3/pkgs/package/data", "linked environment data")
	put(t, w.home, "Desktop/keep.txt", "desktop content")
	home := scan(t, w, w.home)
	if goRoot := find(t, home, filepath.Join(w.home, "go")); goRoot.Risk != cleaner.Personal || goRoot.Category != "files" {
		t.Fatalf("mixed Go workspace was marked disposable: %+v", goRoot)
	}
	desktop := find(t, home, filepath.Join(w.home, "Desktop"))
	if desktop.CanClean || desktop.BlockedLabel != "Protected folder" {
		t.Fatalf("Desktop protection is unclear: %+v", desktop)
	}
	for _, path := range []string{source, filepath.Join(w.home, "Downloads/target"), filepath.Join(w.home, "Downloads/node_modules"), filepath.Join(w.home, ".npm/_cacache-backup")} {
		item := find(t, scan(t, w, filepath.Dir(path)), path)
		if item.Risk != cleaner.Personal || item.Category != "files" {
			t.Fatalf("ordinary content was classified as disposable: %+v", item)
		}
	}
	cachedFile := find(t, scan(t, w, filepath.Dir(cacheFile)), cacheFile)
	if cachedFile.Risk != cleaner.Rebuildable || cachedFile.Kind != "Go modules" || cachedFile.Name != "package.go" {
		t.Fatalf("cache descendant lost its classification or name: %+v", cachedFile)
	}
	conda := find(t, scan(t, w, filepath.Dir(condaFile)), condaFile)
	if conda.CanClean || conda.BlockedLabel != "Use Conda" {
		t.Fatalf("Conda descendant bypassed tool-managed cleanup: %+v", conda)
	}
	if _, err := w.engine.Cleanup(context.Background(), home.ID, []string{desktop.ID}, "permanent", true); err == nil {
		t.Fatal("protected Desktop cleanup was accepted")
	}
}
