package cleaner

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestCancelHomeWhileMacOSIsWaitingToOpenAFolder(t *testing.T) {
	home, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	for _, folder := range []string{"Desktop", "Downloads"} {
		if err := os.Mkdir(filepath.Join(home, folder), 0700); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(home, folder, "keep.txt"), []byte("keep me"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	engine, err := New(home, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	previous, err := engine.Browse(context.Background(), "previous", filepath.Join(home, "Downloads"), nil)
	if err != nil {
		t.Fatal(err)
	}
	blocked, release := make(chan struct{}), make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	var opens atomic.Int32
	engine.reader = newDirectoryReader(func(path string) ([]os.DirEntry, error) {
		if path == filepath.Join(home, "Desktop") {
			if opens.Add(1) == 1 {
				close(blocked)
			}
			<-release // Model the OS waiting for a folder-access decision.
		}
		return os.ReadDir(path)
	})
	results := make(chan Scan, 1)
	go func() { result, _ := engine.Browse(context.Background(), "home", home, nil); results <- result }()
	select {
	case <-blocked:
	case <-time.After(3 * time.Second):
		t.Fatal("Home never reached the protected folder")
	}
	engine.Cancel("home")
	select {
	case result := <-results:
		if !result.Cancelled {
			t.Fatal("Home cancellation was lost")
		}
		if _, err := engine.Cleanup(context.Background(), result.ID, []string{"anything"}, "permanent", true); err == nil {
			t.Fatal("partial Home scan authorized cleanup")
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Cancel waited for the OS folder read")
	}
	// Repeated cancelled visits must not consume another blocked OS thread.
	for range 12 {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
		go func() { result, _ := engine.Scan(ctx, "retry", filepath.Join(home, "Desktop"), nil); results <- result }()
		select {
		case result := <-results:
			if !result.Cancelled {
				t.Fatal("retry did not cancel")
			}
		case <-time.After(3 * time.Second):
			cancel()
			t.Fatal("retry stayed stuck")
		}
		cancel()
	}
	next, err := engine.Browse(context.Background(), "next", filepath.Join(home, "Downloads"), nil)
	if err != nil || next.ID != previous.ID {
		t.Fatal("cancellation lost previous results or blocked navigation", err)
	}
	refreshed, err := engine.Scan(context.Background(), "refresh", filepath.Join(home, "Downloads"), nil)
	if err != nil || len(refreshed.Items) != 1 || refreshed.Cancelled {
		t.Fatal("another folder could not be refreshed", err)
	}
	if opens.Load() != 1 {
		t.Fatal("repeated visits started duplicate blocked reads")
	}
	once.Do(func() { close(release) })
	complete, err := engine.Scan(context.Background(), "complete", home, nil)
	if err != nil || complete.Cancelled || len(complete.Items) != 2 {
		t.Fatal("Home could not complete after access resumed", err)
	}
	for _, folder := range []string{"Desktop", "Downloads"} {
		if content, err := os.ReadFile(filepath.Join(home, folder, "keep.txt")); err != nil || string(content) != "keep me" {
			t.Fatal("cancellation changed files")
		}
	}
}
