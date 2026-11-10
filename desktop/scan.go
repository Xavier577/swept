package main

import (
	"context"
	"errors"
	"fmt"

	"swept/internal/cleaner"
)

type ScanFinished struct {
	JobID string        `json:"jobId"`
	Scan  *cleaner.Scan `json:"scan"`
	Error string        `json:"error"`
}

// Start promptly; progress and completion belong to this job, independent of
// the native request acknowledging its start.
func (s *Service) startScan(jobID, path string, refresh bool) error {
	if jobID == "" {
		return errors.New("scan job ID is required")
	}
	if !s.operation.TryLock() {
		return errors.New("another operation is running")
	}
	ctx, cancel := context.WithCancel(context.Background())
	s.scanMu.Lock()
	s.scanJob, s.scanCancel = jobID, cancel
	s.scanMu.Unlock()
	go s.runScan(ctx, cancel, jobID, path, refresh)
	return nil
}

func (s *Service) runScan(ctx context.Context, cancel context.CancelFunc, jobID, path string, refresh bool) {
	finished := ScanFinished{JobID: jobID}
	defer func() {
		if failure := recover(); failure != nil {
			finished.Scan = nil
			finished.Error = fmt.Sprintf("scan failed: %v", failure)
		}
		s.scanMu.Lock()
		s.scanJob, s.scanCancel = "", nil
		s.scanMu.Unlock()
		cancel()
		// Completion means the next operation can start, including when the UI
		// receives this event before the short start/cancel call has returned.
		s.operation.Unlock()
		s.notify("scan-finished", finished)
	}()
	emit := func(progress cleaner.Progress) {
		if ctx.Err() == nil {
			s.notify("scan-progress", progress)
		}
	}
	scan := s.engine.Browse
	if refresh {
		scan = s.engine.Scan
	}
	result, err := scan(ctx, jobID, path, emit)
	if ctx.Err() != nil {
		// Partial measurements cannot be used or reviewed. Send only the
		// cancellation outcome, regardless of how much the scan had collected.
		result = cleaner.Scan{ID: result.ID, Cancelled: true}
	} else if err != nil {
		finished.Error = err.Error()
		return
	}
	finished.Scan = &result
}
