// Package managed delegates managed storage to its owning tool. It never removes
// Docker disk images, simulator directories, or Homebrew installations by path.
package managed

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type Action struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Risk        string `json:"risk"`
}
type Report struct {
	ID       string    `json:"id"`
	Tool     string    `json:"tool"`
	Output   string    `json:"output"`
	Actions  []Action  `json:"actions"`
	Endpoint string    `json:"endpoint"`
	At       time.Time `json:"at"`
}
type Outcome struct {
	Name    string `json:"name"`
	Status  string `json:"status"`
	Message string `json:"message"`
}
type Result struct {
	Output   string    `json:"output"`
	Outcomes []Outcome `json:"outcomes"`
}
type plan struct {
	report        Report
	executable    string
	dockerTargets map[string]dockerTarget
}
type Manager struct {
	mu    sync.Mutex
	plans map[string]plan
}

func New() *Manager { return &Manager{plans: make(map[string]plan)} }

func executable(name string) (string, error) {
	paths := []string{"/opt/homebrew/bin/" + name, "/usr/local/bin/" + name, "/usr/bin/" + name}
	if name == "conda" {
		home, _ := os.UserHomeDir()
		for _, folder := range []string{"miniconda3", "anaconda3", "miniforge3"} {
			paths = append(paths, home+"/"+folder+"/bin/conda")
		}
	}
	if name == "docker" {
		paths = append(paths, "/Applications/Docker.app/Contents/Resources/bin/docker")
	}
	for _, path := range paths {
		if info, err := os.Stat(path); err == nil && !info.IsDir() && info.Mode()&0111 != 0 {
			return path, nil
		}
	}
	return "", fmt.Errorf("%s is not installed in a standard location", name)
}

// Command output is drained while bounded in memory, including on timeout.
type limitedOutput struct {
	mu     sync.Mutex
	buffer bytes.Buffer
}

func (b *limitedOutput) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	n := len(p)
	remaining := 128*1024 - b.buffer.Len()
	if remaining > 0 {
		if len(p) > remaining {
			p = p[:remaining]
		}
		b.buffer.Write(p)
	}
	return n, nil
}
func run(ctx context.Context, binary string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, binary, args...)
	cmd.Env = append(os.Environ(), "HOMEBREW_NO_AUTO_UPDATE=1", "HOMEBREW_NO_ANALYTICS=1", "NO_COLOR=1")
	var output limitedOutput
	cmd.Stdout = &output
	cmd.Stderr = &output
	cmd.WaitDelay = 3 * time.Second
	err := cmd.Run()
	text := strings.TrimSpace(output.buffer.String())
	if ctx.Err() != nil {
		return text, fmt.Errorf("tool timed out; inspect its current state before retrying: %w", ctx.Err())
	}
	if err != nil {
		return text, fmt.Errorf("%s: %w\n%s", binary, err, text)
	}
	return text, nil
}
func localDockerEndpoint(ctx context.Context, binary string) (string, error) {
	endpoint := os.Getenv("DOCKER_HOST")
	if endpoint == "" || os.Getenv("DOCKER_CONTEXT") != "" {
		var err error
		endpoint, err = run(ctx, binary, "context", "inspect", "--format", "{{.Endpoints.docker.Host}}")
		if err != nil {
			return "", err
		}
	}
	if !strings.HasPrefix(endpoint, "unix:///") || strings.ContainsAny(endpoint, "\r\n") {
		return "", errors.New("Swept only cleans local Docker engines using a Unix socket; remote contexts are disabled")
	}
	return endpoint, nil
}
func (m *Manager) Inspect(ctx context.Context, tool string) (Report, error) {
	report := Report{ID: rand.Text(), Tool: tool, At: time.Now(), Actions: []Action{}}
	var name string
	var args []string
	switch tool {
	case "docker":
		name = "docker"
		args = []string{"system", "df"}

	case "homebrew":
		name = "brew"
		args = []string{"cleanup", "--dry-run"}
		report.Actions = []Action{{"brew-cleanup", "Homebrew cleanup", "Remove old formula versions and stale downloads using Homebrew's own cleanup rules. The output above is a dry run.", "review"}}
	case "conda":
		name = "conda"
		args = []string{"clean", "--all", "--dry-run"}
		report.Actions = []Action{{"conda-cleanup", "Conda cleanup", "Remove index caches, package tarballs, and unused cached packages using Conda. Environments that symlink into the package cache may stop working; review your environment setup first.", "review"}}
	case "simulators":
		name = "xcrun"
		args = []string{"simctl", "list", "devices", "unavailable"}
		report.Actions = []Action{{"simulators-unavailable", "Unavailable simulators", "Permanently delete every unavailable simulator and its installed apps and data.", "personal"}}
	default:
		return report, errors.New("unknown tool")
	}
	binary, err := executable(name)
	if err != nil {
		return report, err
	}
	if tool == "docker" {
		report.Endpoint, err = localDockerEndpoint(ctx, binary)
		if err != nil {
			return report, err
		}
		args = append([]string{"--host", report.Endpoint}, args...)
	}
	report.Output, err = run(ctx, binary, args...)
	if err != nil {
		if tool == "docker" {
			provider := "your local Docker engine"
			if strings.Contains(report.Endpoint, "/.orbstack/") {
				provider = "OrbStack"
			}
			return report, fmt.Errorf("Cannot inspect Docker storage. Make sure %s is running, then try Inspect again. If it is running, check your Docker context and socket access. The offline storage estimate is still available.\n\nDetails: %w", provider, err)
		}
		if tool == "simulators" {
			return report, fmt.Errorf("Cannot inspect simulators. Install Xcode and select it in Xcode Settings → Locations → Command Line Tools, then try again.\n\nDetails: %w", err)
		}
		return report, err
	}
	var targets map[string]dockerTarget
	if tool == "docker" {
		inventory, err := readDocker(ctx, report.Endpoint)
		if err != nil {
			return report, err
		}
		report.Actions, targets = dockerActions(inventory)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if len(m.plans) > 10 {
		m.plans = make(map[string]plan)
	}
	m.plans[report.ID] = plan{report: report, executable: binary, dockerTargets: targets}
	return report, nil
}

// Execute validates the whole selection before any mutation. Each Docker resource
// is then rechecked immediately before removal, and gets its own outcome.
func (m *Manager) Execute(ctx context.Context, reportID string, actionIDs []string, confirmation string) (Result, error) {
	if confirmation != "CLEAN" {
		return Result{}, errors.New("type CLEAN to confirm permanent removal")
	}
	if len(actionIDs) == 0 {
		return Result{}, errors.New("select at least one resource")
	}
	m.mu.Lock()
	p, ok := m.plans[reportID]
	delete(m.plans, reportID)
	m.mu.Unlock()
	if !ok || time.Since(p.report.At) > 10*time.Minute {
		return Result{}, errors.New("tool preview expired; inspect again")
	}
	selected := make(map[string]bool, len(actionIDs))
	for _, id := range actionIDs {
		allowed := false
		for _, action := range p.report.Actions {
			if action.ID == id {
				allowed = true
				break
			}
		}
		if !allowed {
			return Result{}, errors.New("selection does not belong to this preview")
		}
		if p.report.Tool == "docker" {
			if _, ok := p.dockerTargets[id]; !ok {
				return Result{}, errors.New("Docker resource does not belong to this preview")
			}
		}
		selected[id] = true
	}
	if p.report.Tool == "docker" {
		result := Result{Outcomes: []Outcome{}}
		for _, action := range p.report.Actions {
			if !selected[action.ID] {
				continue
			}
			outcome, err := cleanDockerTarget(ctx, p.report.Endpoint, p.dockerTargets[action.ID])
			if err != nil {
				outcome.Status = "attention"
				outcome.Message = err.Error()
			}
			result.Outcomes = append(result.Outcomes, outcome)
		}
		return result, nil
	}
	if len(selected) != 1 {
		return Result{}, errors.New("this tool supports one cleanup action at a time")
	}
	var args []string
	switch actionIDs[0] {
	case "conda-cleanup":
		args = []string{"clean", "--all", "--yes"}
	case "brew-cleanup":
		args = []string{"cleanup"}
	case "simulators-unavailable":
		args = []string{"simctl", "delete", "unavailable"}
	default:
		return Result{}, errors.New("unknown action")
	}
	output, err := run(ctx, p.executable, args...)
	return Result{Output: output, Outcomes: []Outcome{}}, err
}
