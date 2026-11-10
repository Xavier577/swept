package managed_test

import (
	"os"
	"path/filepath"
	"swept/internal/managed"
	"syscall"
	"testing"
)

func TestOfflineStorageMeasuresSparseImagesWithoutAnEngineOrChangingData(t *testing.T) {
	home := t.TempDir()
	directory := filepath.Join(home, "Library/Group Containers/HUAQ24HBR6.dev.orbstack/data")
	if err := os.MkdirAll(directory, 0700); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(directory, "data.img.raw")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := file.Truncate(1 << 40); err != nil {
		t.Fatal(err)
	}
	if _, err := file.WriteAt([]byte("keep this data"), 0); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	// Older and newer names can alias one disk; do not count it twice.
	if err := os.Symlink(path, filepath.Join(directory, "data.img")); err != nil {
		t.Fatal(err)
	}
	before, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", "")
	report := managed.ReadStorage(home)
	if len(report.Files) != 1 || len(report.Warnings) != 0 {
		t.Fatalf("unexpected storage report: %+v", report)
	}
	disk := report.Files[0]
	if disk.Bytes != before.Sys().(*syscall.Stat_t).Blocks*512 || disk.LogicalBytes != 1<<40 || disk.Bytes >= disk.LogicalBytes {
		t.Fatalf("sparse capacity reported as occupied space: %+v", disk)
	}
	reopened, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer reopened.Close()
	contents := make([]byte, 14)
	if _, err := reopened.ReadAt(contents, 0); err != nil {
		t.Fatal(err)
	}
	after, err := reopened.Stat()
	if err != nil {
		t.Fatal(err)
	}
	if string(contents) != "keep this data" || before.Size() != after.Size() || before.ModTime() != after.ModTime() {
		t.Fatal("offline inspection modified the storage image")
	}
	empty := managed.ReadStorage(t.TempDir())
	if len(empty.Files) != 0 || len(empty.Warnings) != 0 {
		t.Fatalf("missing installations should not produce errors: %+v", empty)
	}
}
