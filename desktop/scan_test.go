package main

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"swept/internal/cleaner"
)

func TestScanCancellationCompletesBeforeAnotherOperationStarts(t *testing.T) {
	for _, refresh := range []bool{false, true} {
		name := "browse"
		if refresh {
			name = "refresh"
		}
		t.Run(name, func(t *testing.T) {
			home, err := filepath.EvalSymlinks(t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			folder := filepath.Join(home, "Downloads")
			if err := os.Mkdir(folder, 0700); err != nil {
				t.Fatal(err)
			}
			file := filepath.Join(folder, "keep.txt")
			if err := os.WriteFile(file, []byte("keep me"), 0600); err != nil {
				t.Fatal(err)
			}
			engine, err := cleaner.New(home, t.TempDir())
			if err != nil {
				t.Fatal(err)
			}
			previous, err := engine.Scan(context.Background(), "previous", folder, nil)
			if err != nil {
				t.Fatal(err)
			}
			progress := make(chan struct{})
			release := make(chan struct{})
			var releaseOnce, progressOnce sync.Once
			unblock := func() { releaseOnce.Do(func() { close(release) }) }
			defer unblock()
			finished := make(chan ScanFinished, 4)
			service := &Service{engine: engine, notify: func(name string, value any) {
				if name == "scan-progress" {
					progressOnce.Do(func() { close(progress); <-release })
				} else if name == "scan-finished" {
					finished <- value.(ScanFinished)
				}
			}}
			start := service.Browse
			if refresh {
				start = service.Scan
			}
			// Starting returns while the real scan is still working.
			if err := start("home", home); err != nil {
				t.Fatal(err)
			}
			select {
			case <-progress:
			case <-time.After(3 * time.Second):
				t.Fatal("scan did not start")
			}
			service.Cancel("home")
			if err := service.Scan("too-early", folder); err == nil {
				t.Fatal("another operation started before the cancelled worker stopped")
			}
			unblock()
			cancelled := awaitScan(t, finished)
			if cancelled.JobID != "home" || cancelled.Error != "" || cancelled.Scan == nil || !cancelled.Scan.Cancelled {
				t.Fatalf("cancellation did not produce a completion event: %+v", cancelled)
			}
			if _, err := engine.Cleanup(context.Background(), cancelled.Scan.ID, []string{"anything"}, "permanent", true); err == nil {
				t.Fatal("cancelled result authorized cleanup")
			}
			if err := service.Browse("next", folder); err != nil {
				t.Fatal("completion left the service locked:", err)
			}
			service.Cancel("home") // A delayed cancel must not affect the next job.
			next := awaitScan(t, finished)
			if next.JobID != "next" || next.Error != "" || next.Scan == nil || next.Scan.Cancelled || next.Scan.ID != previous.ID {
				t.Fatalf("previous results were lost or the next operation failed: %+v", next)
			}
			if err := service.Scan("missing", filepath.Join(home, "missing")); err != nil {
				t.Fatal(err)
			}
			if failure := awaitScan(t, finished); failure.JobID != "missing" || failure.Error == "" {
				t.Fatalf("scan error did not complete: %+v", failure)
			}
			if err := service.Scan("retry", folder); err != nil {
				t.Fatal(err)
			}
			if retry := awaitScan(t, finished); retry.Error != "" || retry.Scan == nil || len(retry.Scan.Items) != 1 {
				t.Fatalf("retry after scan error failed: %+v", retry)
			}
			if data, err := os.ReadFile(file); err != nil || string(data) != "keep me" {
				t.Fatal("scan cancellation changed files")
			}
		})
	}
}

func awaitScan(t *testing.T, results <-chan ScanFinished) ScanFinished {
	t.Helper()
	select {
	case result := <-results:
		return result
	case <-time.After(3 * time.Second):
		t.Fatal("scan never reported completion")
		return ScanFinished{}
	}
}
