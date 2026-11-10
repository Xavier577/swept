package cleaner

import (
	"context"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
)

type candidate struct {
	path, category, kind, reason string
	risk                         Risk
}
type location struct {
	relative, category, kind, reason string
	risk                             Risk
	children                         bool
}

var locations = []location{
	{".npm/_cacache", "node", "npm cache", "Downloaded packages can be fetched again.", Rebuildable, false},
	{".npm/_logs", "node", "npm logs", "Historical package manager logs.", Rebuildable, false},
	{".yarn/cache", "node", "Yarn cache", "Packages will be downloaded again when needed.", Rebuildable, false},
	{".pnpm-store", "node", "pnpm store", "Shared package store; reinstall dependencies after cleaning.", Review, false},
	{"Library/pnpm/store", "node", "pnpm store", "Shared package store; reinstall dependencies after cleaning.", Review, false},
	{"Library/Developer/Xcode/DerivedData", "xcode", "Derived data", "Xcode will rebuild this project's indexes and outputs.", Rebuildable, true},
	{"Library/Developer/Xcode/Archives", "xcode", "Archive", "May contain the only build and debug symbols for a shipped app.", Personal, true},
	{"Library/Developer/Xcode/iOS DeviceSupport", "xcode", "Device support", "Debugging this OS version may require downloading support again.", Review, true},
	{".cache/pip", "python", "pip cache", "Downloaded Python packages can be fetched again.", Rebuildable, false},
	{"anaconda3/pkgs", "python", "Conda cache", "May be linked to existing environments. Use Conda's own cleanup tool.", Review, false},
	{"miniconda3/pkgs", "python", "Conda cache", "May be linked to existing environments. Use Conda's own cleanup tool.", Review, false},
	{".gradle/caches", "misc", "Gradle cache", "Dependencies and transforms will be downloaded or rebuilt.", Rebuildable, false},
	{".m2/repository", "misc", "Maven repository", "May contain locally published artifacts that cannot be downloaded.", Review, false},
	{".cargo/registry", "misc", "Cargo registry", "Crates will be downloaded again.", Rebuildable, false},
	{".cargo/git/db", "misc", "Cargo Git cache", "Git dependencies will be fetched again.", Rebuildable, false},
	{"go/pkg/mod", "misc", "Go modules", "Go modules will be downloaded again.", Rebuildable, false},
}

func (r *scanRun) discover(ctx context.Context, settings Settings) []candidate {
	var found []candidate
	for _, loc := range locations {
		path := filepath.Join(r.home, loc.relative)
		if _, err := os.Lstat(path); os.IsNotExist(err) {
			continue
		}
		if loc.children {
			for _, child := range r.children(ctx, path) {
				found = append(found, r.classify(filepath.Join(path, child.Name())))
			}
			continue
		}
		found = append(found, r.classify(path))
	}
	for _, root := range []string{"Library/Caches", "Library/Logs"} {
		path := filepath.Join(r.home, root)
		for _, child := range r.children(ctx, path) {
			childPath := filepath.Join(path, child.Name())
			if root == "Library/Caches" && browserStorage(r.home, childPath) {
				continue
			}
			found = append(found, r.classify(childPath))
		}
	}
	found = append(found, r.discoverBrowserCaches(ctx)...)
	for _, root := range settings.ProjectRoots {
		if err := noSymlinkComponents(r.home, root); err != nil {
			r.warn(root, err)
			continue
		}
		rootInfo, err := os.Stat(root)
		if err != nil {
			r.warn(root, err)
			continue
		}
		device := rootInfo.Sys().(*syscall.Stat_t).Dev
		err = r.reader.walk(ctx, root, func(path string, entry fs.DirEntry, err error) error {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			if err != nil {
				r.warn(path, err)
				return nil
			}
			if !entry.IsDir() {
				return nil
			}
			info, err := entry.Info()
			if err != nil {
				r.warn(path, err)
				return filepath.SkipDir
			}
			if info.Sys().(*syscall.Stat_t).Dev != device {
				r.skip(path, "Separate mounted filesystem; outside this scan.")
				return filepath.SkipDir
			}
			if r.excluded(path) {
				return filepath.SkipDir
			}
			r.progress("Finding project artifacts", path)
			if path == root {
				return nil
			}
			name := entry.Name()
			if name == ".git" || name == "Library" || name == ".Trash" || strings.HasSuffix(name, ".app") {
				return filepath.SkipDir
			}
			c, ok := projectArtifact(path)
			if !ok {
				return nil
			}
			found = append(found, c)
			return filepath.SkipDir
		})
		if err != nil && ctx.Err() == nil {
			r.warn(root, err)
		}
	}
	// Parent candidates subsume their descendants, including overlapping roots.
	sort.Slice(found, func(i, j int) bool { return found[i].path < found[j].path })
	result := make([]candidate, 0, len(found))
	for _, c := range found {
		if r.excluded(c.path) {
			continue
		}
		covered := false
		for _, parent := range result {
			if within(parent.path, c.path) {
				covered = true
				break
			}
		}
		if covered {
			continue
		}
		result = append(result, c)
	}
	return result
}

func exists(path string) bool { _, err := os.Stat(path); return err == nil }
func (r *scanRun) children(ctx context.Context, path string) []os.DirEntry {
	if err := noSymlinkComponents(r.home, path); err != nil {
		if !os.IsNotExist(err) {
			r.warn(path, err)
		}
		return nil
	}
	entries, err := r.reader.read(ctx, path)
	if err != nil && ctx.Err() == nil && !os.IsNotExist(err) {
		r.warn(path, err)
	}
	return entries
}

func (r *scanRun) classify(path string) candidate {
	if c, ok := browserCache(r.home, path); ok {
		return c
	}
	if browserStorage(r.home, path) {
		return candidate{path, "system", "Browser storage", "Only recognised browser cache folders can be cleaned. Other browser storage is protected.", Personal}
	}
	for _, loc := range locations {
		if within(filepath.Join(r.home, loc.relative), path) {
			return candidate{path, loc.category, loc.kind, loc.reason, loc.risk}
		}
	}
	cacheRoot := filepath.Join(r.home, "Library/Caches")
	if path != cacheRoot && within(cacheRoot, path) {
		relative, _ := filepath.Rel(cacheRoot, path)
		category := "system"
		switch strings.Split(relative, string(os.PathSeparator))[0] {
		case "Homebrew":
			category = "homebrew"
		case "pip", "pypoetry", "uv":
			category = "python"
		case "Yarn", "pnpm", "node-gyp":
			category = "node"
		case "go-build", "CocoaPods", "org.swift.swiftpm":
			category = "misc"
		default:
			return candidate{path, category, "App storage", "This app's cache contents have not been verified. Review them before deleting; they may include data the app cannot restore.", Personal}
		}
		return candidate{path, category, "Cache", "Close the related app first. Cached content may need to be downloaded or rebuilt.", Rebuildable}
	}
	logsRoot := filepath.Join(r.home, "Library/Logs")
	if path != logsRoot && within(logsRoot, path) {
		category := "logs"
		if within(filepath.Join(logsRoot, "Homebrew"), path) {
			category = "homebrew"
		}
		return candidate{path, category, "Logs", "Historical logs may be useful for troubleshooting.", Review}
	}
	// Descendants inherit the outer artifact's classification; parents never inherit
	// a child's classification because they can also contain source or personal files.
	relative, _ := filepath.Rel(r.home, path)
	current := r.home
	for _, part := range strings.Split(relative, string(os.PathSeparator)) {
		current = filepath.Join(current, part)
		if c, ok := projectArtifact(current); ok {
			c.path = path
			return c
		}
	}
	return candidate{path, "files", "File or folder", "Swept has not identified this as a known cache or build artifact. Review its contents before deleting.", Personal}
}

func projectArtifact(path string) (candidate, bool) {
	name := filepath.Base(path)
	c := candidate{path: path, risk: Rebuildable}
	switch {
	case name == "node_modules":
		c.category, c.kind, c.reason = "node", "Dependencies", "Run the project's package manager install command to restore dependencies."
	case name == "target" && exists(filepath.Join(filepath.Dir(path), "Cargo.toml")):
		c.category, c.kind, c.reason = "misc", "Rust build output", "Cargo will rebuild this project's outputs."
	case name == ".next" && exists(filepath.Join(filepath.Dir(path), "package.json")):
		c.category, c.kind, c.reason = "node", "Next.js build", "Next.js will rebuild the application."
	case name == "__pycache__":
		c.category, c.kind, c.reason = "python", "Python bytecode", "Python will compile bytecode again."
	case (name == ".venv" || name == "venv") && exists(filepath.Join(path, "pyvenv.cfg")):
		c.category, c.kind, c.reason, c.risk = "python", "Virtual environment", "Recreate this environment from your dependency lockfile. It may contain unrecorded packages.", Review
	default:
		return candidate{}, false
	}
	info, err := os.Lstat(path)
	return c, err == nil && info.IsDir()
}
