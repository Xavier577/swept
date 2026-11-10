package cleaner_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"swept/internal/cleaner"
)

func TestBrowserCleanupRemovesOnlyReviewedCachesAndKeepsProfileData(t *testing.T) {
	w := newWorkspace(t)
	caches := []string{
		"Google/Chrome/Default/Cache", "Google/Chrome/Profile 2/Code Cache",
		"Google/Chrome Beta/Default/Cache", "Chromium/Default/Cache",
		"Firefox/Profiles/example.default-release/cache2",
	}
	for _, cache := range caches {
		put(t, w.home, "Library/Caches/"+cache+"/entries/payload", "downloaded content")
	}
	kept := []string{
		"Library/Application Support/Google/Chrome/Default/Cookies",
		"Library/Application Support/Google/Chrome/Default/Login Data",
		"Library/Application Support/Google/Chrome/Default/History",
		"Library/Application Support/Google/Chrome/Default/Local Storage/data",
		"Library/Application Support/Firefox/Profiles/example.default-release/logins.json",
		"Library/Application Support/Firefox/Profiles/example.default-release/key4.db",
		"Library/Caches/Google/Chrome/Default/Storage/data",
		"Library/Caches/Google/Chrome/Default/Cookies",
		"Library/Caches/Google/Chrome/Default/Service Worker/CacheStorage/offline-work",
		"Library/Caches/Google/Chrome/Default/Cache-backup/data",
		"Library/Caches/Firefox/Profiles/example.default-release/storage/data",
	}
	for _, path := range kept {
		put(t, w.home, path, "keep me")
	}
	overview := scan(t, w, "")
	if len(overview.Items) != len(caches) {
		t.Fatalf("overview offered browser data beyond known caches: %+v", overview.Items)
	}
	var ids []string
	for _, cache := range caches {
		path := filepath.Join(w.home, "Library/Caches", cache)
		item := find(t, overview, path)
		explored := find(t, scan(t, w, filepath.Dir(path)), path)
		if !item.CanClean || item.Risk != cleaner.Rebuildable || explored.Risk != item.Risk || explored.Reason != item.Reason || !explored.CanClean {
			t.Fatalf("cache classification differs between discovery and browsing: %+v / %+v", item, explored)
		}
		ids = append(ids, item.ID)
	}
	result, err := w.engine.Cleanup(context.Background(), overview.ID, ids, "permanent", true)
	if err != nil {
		t.Fatal(err)
	}
	for _, outcome := range result.Items {
		if outcome.Error != "" {
			t.Fatal(outcome.Error)
		}
		if _, err := os.Stat(outcome.Path); !os.IsNotExist(err) {
			t.Fatalf("selected cache remains: %s", outcome.Path)
		}
	}
	for _, path := range kept {
		assertContents(t, filepath.Join(w.home, path), "keep me")
	}
}

func TestExplorerBlocksBrowserParentsAndUnrecognisedStorage(t *testing.T) {
	w := newWorkspace(t)
	paths := []string{
		"Library/Caches/Google/Chrome/Profile 1/Cache/entries/payload",
		"Library/Caches/Google/Chrome/Profile 1/Storage/offline-work",
		"Library/Caches/Google/Chrome/Profile 1/Login Data",
		"Library/Caches/Google/Chrome/Profile 1/Cache-backup/data",
		"Library/Caches/Google/Chrome/Profile unknown/Cache/data",
		"Library/Caches/Google/Chrome/Profile 2/Cache", // A file named Cache is not a cache directory.
		"Library/Caches/com.apple.Safari/data",
		"Library/Caches/Microsoft Edge/Default/Storage/data",
		"Library/Safari/Bookmarks.plist",
		"Library/Cookies/Cookies.binarycookies",
		"Library/WebKit/WebsiteData/data",
		"Library/Application Support/Google/Chrome/Default/Cookies",
	}
	for _, path := range paths {
		put(t, w.home, path, "keep me")
	}
	blocked := []string{
		"Library/Caches/Google", "Library/Caches/Google/Chrome", "Library/Caches/Google/Chrome/Profile 1",
		"Library/Caches/Google/Chrome/Profile 1/Storage", "Library/Caches/Google/Chrome/Profile 1/Login Data",
		"Library/Caches/Google/Chrome/Profile 1/Cache-backup", "Library/Caches/Google/Chrome/Profile unknown/Cache",
		"Library/Caches/Google/Chrome/Profile 2/Cache", "Library/Caches/com.apple.Safari",
		"Library/Caches/Microsoft Edge/Default/Storage", "Library/Safari/Bookmarks.plist",
		"Library/Cookies/Cookies.binarycookies", "Library/WebKit/WebsiteData/data",
		"Library/Application Support/Google/Chrome/Default/Cookies",
	}
	for _, relative := range blocked {
		path := filepath.Join(w.home, relative)
		result := scan(t, w, filepath.Dir(path))
		item := find(t, result, path)
		if item.CanClean || item.Risk == cleaner.Rebuildable {
			t.Fatalf("browser data was offered as cleanable: %+v", item)
		}
		if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true); err == nil {
			t.Fatalf("backend accepted protected browser data: %s", path)
		}
	}
	for _, path := range paths {
		assertContents(t, filepath.Join(w.home, path), "keep me")
	}
	// On a case-insensitive volume, the path field can reach the same data using
	// another spelling. Browsing and cleanup must keep it protected.
	for _, relative := range []string{
		"library/caches/google/chrome/Profile 1/Storage",
		"library/application support/google/chrome/Default/Cookies",
		"library/safari/Bookmarks.plist",
	} {
		path := filepath.Join(w.home, relative)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			continue // Case-sensitive filesystems do not resolve these aliases.
		}
		result := scan(t, w, filepath.Dir(path))
		item := find(t, result, path)
		if item.CanClean {
			t.Fatalf("path casing bypassed browser protection: %+v", item)
		}
		if _, err := w.engine.Cleanup(context.Background(), result.ID, []string{item.ID}, "permanent", true); err == nil {
			t.Fatalf("backend accepted a protected path alias: %s", path)
		}
	}
	put(t, w.home, "Library/Caches/UnknownApp/Cache/data", "unverified")
	put(t, w.home, "Library/Caches/Homebrew/downloads/data", "package")
	result := scan(t, w, filepath.Join(w.home, "Library/Caches"))
	if unknown := find(t, result, filepath.Join(w.home, "Library/Caches/UnknownApp")); unknown.Risk != cleaner.Personal {
		t.Fatalf("unknown app storage was marked rebuildable: %+v", unknown)
	}
	if known := find(t, result, filepath.Join(w.home, "Library/Caches/Homebrew")); known.Risk != cleaner.Rebuildable || !known.CanClean {
		t.Fatalf("known developer cache lost its classification: %+v", known)
	}
	cacheFile := filepath.Join(w.home, paths[0])
	if item := find(t, scan(t, w, filepath.Dir(cacheFile)), cacheFile); !item.CanClean || item.Risk != cleaner.Rebuildable {
		t.Fatalf("cache descendant lost its classification: %+v", item)
	}
}

func TestBrowserCacheSymlinkCannotExposeProfileDataForCleanup(t *testing.T) {
	w := newWorkspace(t)
	cookie := put(t, w.home, "Library/Application Support/Google/Chrome/Default/Cookies", "keep me")
	profile := filepath.Join(w.home, "Library/Caches/Google/Chrome/Default")
	if err := os.MkdirAll(profile, 0700); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Dir(cookie), filepath.Join(profile, "Cache")); err != nil {
		t.Fatal(err)
	}
	if result := scan(t, w, ""); len(result.Items) != 0 {
		t.Fatalf("symlink to profile data was offered for cleanup: %+v", result.Items)
	}
	result := scan(t, w, profile)
	if len(result.Items) != 0 || result.SkippedCount != 1 {
		t.Fatalf("explorer followed a cache symlink: %+v", result)
	}
	assertContents(t, cookie, "keep me")
}
