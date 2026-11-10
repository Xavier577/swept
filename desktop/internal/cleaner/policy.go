package cleaner

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

func within(parent, child string) bool {
	rel, err := filepath.Rel(parent, child)
	return err == nil && rel != ".." && !strings.HasPrefix(rel, ".."+string(os.PathSeparator))
}

// macOS usually resolves paths without regard to case. Protection must not be
// bypassed by typing a differently capitalised path in Explorer.
func withinIgnoringCase(parent, child string) bool {
	return within(strings.ToLower(parent), strings.ToLower(child))
}

// The application never needs permission to remove a home root, credentials,
// application databases, its own state, or OS-managed storage.
var protectedTrees = []string{
	".ssh", ".aws", ".gnupg", ".kube", ".Trash", ".codex", ".config",
	"Library/Keychains", "Library/Mail", "Library/Messages",
	"Library/Safari", "Library/Cookies", "Library/WebKit",
	"Library/Application Support", "Library/Containers", "Library/Group Containers",
	"Library/Mobile Documents", "Library/CloudStorage", "Library/Developer/CoreSimulator",
}
var protectedRoots = []string{".", "Library", "Library/Caches", "Library/Logs", "Library/Developer", "Library/Developer/Xcode", "Desktop", "Documents", "Downloads", "Pictures", "Movies", "Music", "Public", "Developer", "Projects", "Applications"}

func validatePath(home, path string) error {
	if !filepath.IsAbs(path) || filepath.Clean(path) != path {
		return errors.New("expected a clean absolute path")
	}
	if !within(home, path) || path == home {
		return errors.New("cleanup is restricted to items inside your home folder")
	}
	for _, relative := range protectedRoots {
		if strings.EqualFold(path, filepath.Join(home, relative)) {
			return errors.New("This folder is protected. Open it to select individual contents.")
		}
	}
	for _, relative := range protectedTrees {
		protected := filepath.Join(home, relative)
		if withinIgnoringCase(protected, path) || withinIgnoringCase(path, protected) {
			return errors.New("this folder contains protected application or personal data")
		}
	}
	if browserStorage(home, path) {
		if _, ok := browserCache(home, path); !ok {
			return errors.New("Browser data is protected. Open this folder to find recognised caches; logins and other browser storage cannot be selected.")
		}
	}
	if exe, err := os.Executable(); err == nil && within(path, exe) {
		return errors.New("Swept cannot remove its own application")
	}
	return noSymlinkComponents(home, path)
}

// An expected scan boundary remains an error for cleanup policy checks.
type skippedLocation struct{ path, reason string }

func (s *skippedLocation) Error() string { return s.path + ": " + s.reason }

func noSymlinkComponents(home, path string) error {
	if !within(home, path) {
		return errors.New("path is outside your home folder")
	}
	homeInfo, err := os.Stat(home)
	if err != nil {
		return err
	}
	device := homeInfo.Sys().(*syscall.Stat_t).Dev
	rel, _ := filepath.Rel(home, path)
	current := home
	for _, component := range strings.Split(rel, string(os.PathSeparator)) {
		current = filepath.Join(current, component)
		info, err := os.Lstat(current)
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return &skippedLocation{current, "Symbolic link; its destination is outside this scan."}
		}
		if info.Sys().(*syscall.Stat_t).Dev != device {
			return &skippedLocation{current, "Separate mounted filesystem; outside this scan."}
		}
	}
	return nil
}
