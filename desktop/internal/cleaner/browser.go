package cleaner

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

type browserCacheLocation struct {
	relative, name string
	cacheNames     []string
}

// Only these cache directories are removable. Profile roots and other browser
// storage stay protected, even when they live under Library/Caches.
var browserCacheLocations = []browserCacheLocation{
	{"Google/Chrome", "Chrome", []string{"Cache", "Code Cache"}},
	{"Google/Chrome Beta", "Chrome Beta", []string{"Cache", "Code Cache"}},
	{"Google/Chrome Dev", "Chrome Dev", []string{"Cache", "Code Cache"}},
	{"Google/Chrome Canary", "Chrome Canary", []string{"Cache", "Code Cache"}},
	{"Chromium", "Chromium", []string{"Cache", "Code Cache"}},
	{"Firefox/Profiles", "Firefox", []string{"cache2"}},
}

var browserCacheTrees = []string{
	"Google", "Chromium", "Firefox", "com.apple.Safari", "com.apple.Safari.SafeBrowsing",
	"Microsoft Edge", "Microsoft Edge Beta", "Microsoft Edge Dev", "Microsoft Edge Canary",
	"BraveSoftware", "Vivaldi", "com.operasoftware.Opera",
}

func browserProfile(name string, browser browserCacheLocation) bool {
	if browser.name == "Firefox" {
		return name != "" && name != "." && !strings.HasPrefix(name, ".")
	}
	if name == "Default" || name == "System Profile" || name == "Guest Profile" {
		return true
	}
	number, ok := strings.CutPrefix(name, "Profile ")
	if !ok || number == "" {
		return false
	}
	for _, digit := range number {
		if digit < '0' || digit > '9' {
			return false
		}
	}
	return true
}

func browserCache(home, path string) (candidate, bool) {
	for _, browser := range browserCacheLocations {
		root := filepath.Join(home, "Library/Caches", browser.relative)
		if !within(root, path) {
			continue
		}
		relative, _ := filepath.Rel(root, path)
		parts := strings.Split(relative, string(os.PathSeparator))
		if len(parts) < 2 || !browserProfile(parts[0], browser) {
			continue
		}
		for _, name := range browser.cacheNames {
			if parts[1] != name {
				continue
			}
			info, err := os.Lstat(filepath.Join(root, parts[0], name))
			if err != nil || !info.IsDir() {
				return candidate{}, false
			}
			reason := "Quit " + browser.name + " before cleaning. Removes cached web resources. Keeps cookies, saved passwords, history, and site storage."
			return candidate{path, "system", browser.name + " cache", reason, Rebuildable}, true
		}
	}
	return candidate{}, false
}

func browserStorage(home, path string) bool {
	for _, relative := range browserCacheTrees {
		root := filepath.Join(home, "Library/Caches", relative)
		if withinIgnoringCase(root, path) || withinIgnoringCase(path, root) {
			return true
		}
	}
	return false
}

func (r *scanRun) discoverBrowserCaches(ctx context.Context) []candidate {
	var found []candidate
	for _, browser := range browserCacheLocations {
		root := filepath.Join(r.home, "Library/Caches", browser.relative)
		if r.excluded(root) {
			continue
		}
		for _, profile := range r.children(ctx, root) {
			if ctx.Err() != nil {
				return found
			}
			if !profile.IsDir() || !browserProfile(profile.Name(), browser) || r.excluded(filepath.Join(root, profile.Name())) {
				continue
			}
			for _, name := range browser.cacheNames {
				path := filepath.Join(root, profile.Name(), name)
				if c, ok := browserCache(r.home, path); ok {
					found = append(found, c)
				}
			}
		}
	}
	return found
}
