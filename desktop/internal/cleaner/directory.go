package cleaner

import (
	"context"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
)

type directoryRead struct {
	done    chan struct{}
	entries []os.DirEntry
	err     error
}

// macOS directory opens can wait on a permission prompt indefinitely. Keep
// those read-only calls separate from scan state so Cancel can stop traversal.
// Repeated visits share an outstanding read; the bound prevents stuck OS calls
// from accumulating threads. Completed reads are never cached here.
type directoryReader struct {
	mu      sync.Mutex
	pending map[string]*directoryRead
	readDir func(string) ([]os.DirEntry, error)
}

func newDirectoryReader(readDir func(string) ([]os.DirEntry, error)) *directoryReader {
	return &directoryReader{pending: make(map[string]*directoryRead), readDir: readDir}
}

func (r *directoryReader) read(ctx context.Context, path string) ([]os.DirEntry, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	r.mu.Lock()
	read := r.pending[path]
	if read == nil {
		if len(r.pending) >= 8 {
			r.mu.Unlock()
			return nil, errors.New("directory reads are still waiting for macOS; respond to any folder access prompts and try again")
		}
		read = &directoryRead{done: make(chan struct{})}
		r.pending[path] = read
		go func() {
			read.entries, read.err = r.readDir(path)
			r.mu.Lock()
			delete(r.pending, path)
			close(read.done)
			r.mu.Unlock()
		}()
	}
	r.mu.Unlock()
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-read.done:
		return read.entries, read.err
	}
}

type scanFS struct {
	root   string
	ctx    context.Context
	reader *directoryReader
}

func (s scanFS) Open(name string) (fs.File, error)     { return os.Open(filepath.Join(s.root, name)) }
func (s scanFS) Stat(name string) (fs.FileInfo, error) { return os.Lstat(filepath.Join(s.root, name)) }
func (s scanFS) ReadDir(name string) ([]fs.DirEntry, error) {
	return s.reader.read(s.ctx, filepath.Join(s.root, name))
}

func (r *directoryReader) walk(ctx context.Context, root string, visit fs.WalkDirFunc) error {
	return fs.WalkDir(scanFS{root, ctx, r}, ".", func(path string, entry fs.DirEntry, err error) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return visit(filepath.Join(root, path), entry, err)
	})
}
