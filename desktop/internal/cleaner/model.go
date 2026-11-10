package cleaner

import "time"

type Risk string

const (
	Rebuildable Risk = "rebuildable"
	Review      Risk = "review"
	Personal    Risk = "personal"
)

type Item struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Path          string    `json:"path"`
	Category      string    `json:"category"`
	Kind          string    `json:"kind"`
	Risk          Risk      `json:"risk"`
	Reason        string    `json:"reason"`
	Bytes         int64     `json:"bytes"`
	LogicalBytes  int64     `json:"logicalBytes"`
	Files         int64     `json:"files"`
	Modified      time.Time `json:"modified"`
	Directory     bool      `json:"directory"`
	CanClean      bool      `json:"canClean"`
	BlockedLabel  string    `json:"blockedLabel"`
	BlockedReason string    `json:"blockedReason"`
}

type Scan struct {
	ID               string    `json:"id"`
	Path             string    `json:"path"`
	Started          time.Time `json:"started"`
	Finished         time.Time `json:"finished"`
	Items            []Item    `json:"items"`
	Warnings         []string  `json:"warnings"`
	WarningCount     int       `json:"warningCount"`
	Skipped          []string  `json:"skipped"`
	SkippedCount     int       `json:"skippedCount"`
	PermissionDenied bool      `json:"permissionDenied"`
	Cancelled        bool      `json:"cancelled"`
}

type Progress struct {
	JobID   string `json:"jobId"`
	Phase   string `json:"phase"`
	Path    string `json:"path"`
	Visited int64  `json:"visited"`
	Items   int    `json:"items"`
}

type Disk struct {
	Total     int64 `json:"total"`
	Available int64 `json:"available"`
}

type Outcome struct {
	Path  string `json:"path"`
	Bytes int64  `json:"bytes"`
	Error string `json:"error"`
}

type Cleanup struct {
	ID              string    `json:"id"`
	At              time.Time `json:"at"`
	Mode            string    `json:"mode"`
	Items           []Outcome `json:"items"`
	RemovedBytes    int64     `json:"removedBytes"`
	AvailableChange int64     `json:"availableChange"`
	Warning         string    `json:"warning"`
}

type Settings struct {
	ProjectRoots  []string `json:"projectRoots"`
	ExcludedPaths []string `json:"excludedPaths"`
	Theme         string   `json:"theme"`
}

type Status struct {
	Home           string    `json:"home"`
	Disk           Disk      `json:"disk"`
	Settings       Settings  `json:"settings"`
	History        []Cleanup `json:"history"`
	PermissionHint string    `json:"permissionHint"`
}
