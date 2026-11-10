package managed

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type dockerInventory struct {
	Containers []struct {
		ID      string `json:"Id"`
		Names   []string
		State   string
		SizeRw  int64
		Created int64
	}
	Images []struct {
		ID         string `json:"Id"`
		RepoTags   []string
		Containers int
		Size       int64
	}
	Volumes []struct {
		Name, CreatedAt, Driver string
		UsageData               *struct{ RefCount, Size int64 }
	}
	BuildCache []struct {
		ID, Description       string
		InUse, Shared         bool
		Size                  int64
		CreatedAt, LastUsedAt string
	}
}
type dockerTarget struct{ kind, id, revision, name string }

// The Unix socket is captured by the preview. Requests cannot follow a changed
// Docker context, use a remote engine, or redirect to another endpoint.
func dockerRequest(ctx context.Context, endpoint, method, path string, result any) error {
	if !strings.HasPrefix(endpoint, "unix:///") {
		return errors.New("only local Docker sockets are supported")
	}
	transport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{Timeout: 5 * time.Second}).DialContext(ctx, "unix", strings.TrimPrefix(endpoint, "unix://"))
	}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 2 * time.Minute, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	request, err := http.NewRequestWithContext(ctx, method, "http://docker"+path, nil)
	if err != nil {
		return err
	}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf("Docker returned %s: %s", response.Status, strings.TrimSpace(string(body)))
	}
	if result == nil {
		return nil
	}
	return json.NewDecoder(io.LimitReader(response.Body, 16<<20)).Decode(result)
}
func readDocker(ctx context.Context, endpoint string) (dockerInventory, error) {
	var inventory dockerInventory
	err := dockerRequest(ctx, endpoint, http.MethodGet, "/system/df", &inventory)
	return inventory, err
}
func dockerActions(inventory dockerInventory) ([]Action, map[string]dockerTarget) {
	actions := []Action{}
	targets := make(map[string]dockerTarget)
	add := func(target dockerTarget, description, risk string) {
		id := rand.Text()
		actions = append(actions, Action{id, target.name, description, risk})
		targets[id] = target
	}
	for _, item := range inventory.Containers {
		if item.State != "exited" && item.State != "created" && item.State != "dead" {
			continue
		}
		name := item.ID
		if len(item.Names) > 0 {
			name = strings.TrimPrefix(item.Names[0], "/")
		}
		add(dockerTarget{"container", item.ID, "", "Container · " + name}, fmt.Sprintf("Remove this stopped container and its writable layer (%s). Mounted volumes are kept. ID: %s", dockerSize(item.SizeRw), item.ID), "personal")
	}
	for _, item := range inventory.Volumes {
		if item.UsageData == nil || item.UsageData.RefCount != 0 || item.Driver != "local" {
			continue
		}
		add(dockerTarget{"volume", item.Name, item.CreatedAt, "Volume · " + item.Name}, fmt.Sprintf("Remove only this unreferenced volume and its data (%s). Created %s. This may contain databases or other personal data.", dockerSize(item.UsageData.Size), item.CreatedAt), "personal")
	}
	for _, item := range inventory.Images {
		tagged := false
		for _, tag := range item.RepoTags {
			if tag != "<none>:<none>" {
				tagged = true
			}
		}
		if tagged || item.Containers != 0 {
			continue
		}
		add(dockerTarget{"image", item.ID, "", "Untagged image · " + item.ID}, fmt.Sprintf("Remove only this unused, untagged image (%s). Other images and parent layers are kept.", dockerSize(item.Size)), "rebuildable")
	}
	for _, item := range inventory.BuildCache {
		if item.InUse || item.Shared {
			continue
		}
		add(dockerTarget{"cache", item.ID, item.CreatedAt + "/" + item.LastUsedAt, "Build cache · " + item.Description}, fmt.Sprintf("Remove only cache record %s (%s). The next build may need to rebuild it.", item.ID, dockerSize(item.Size)), "rebuildable")
	}
	return actions, targets
}
func cleanDockerTarget(ctx context.Context, endpoint string, target dockerTarget) (Outcome, error) {
	result := Outcome{Name: target.name, Status: "kept"}
	inventory, err := readDocker(ctx, endpoint)
	if err != nil {
		return result, err
	}
	_, current := dockerActions(inventory)
	valid := false
	for _, item := range current {
		if item.kind == target.kind && item.id == target.id && item.revision == target.revision {
			valid = true
			break
		}
	}
	if !valid {
		return result, errors.New("this Docker resource changed or is now in use; inspect again")
	}
	var path string
	switch target.kind {
	case "container":
		path = "/containers/" + url.PathEscape(target.id)
	case "volume":
		path = "/volumes/" + url.PathEscape(target.id)
	case "image":
		path = "/images/" + url.PathEscape(target.id) + "?noprune=true"
	case "cache":
		filters, _ := json.Marshal(map[string][]string{"id": {target.id}})
		query := url.Values{"filters": {string(filters)}, "all": {"true"}}
		var cacheResult struct {
			CachesDeleted  []string
			SpaceReclaimed int64
		}
		if err := dockerRequest(ctx, endpoint, http.MethodPost, "/build/prune?"+query.Encode(), &cacheResult); err != nil {
			return result, err
		}
		if len(cacheResult.CachesDeleted) == 0 {
			result.Message = "Docker kept this cache record because it may still be needed by another cache record or a build."
			return result, nil
		}
		return Outcome{Name: target.name, Status: "removed", Message: fmt.Sprintf("Docker reports %s reclaimed.", dockerSize(cacheResult.SpaceReclaimed))}, nil
	default:
		return result, errors.New("unknown Docker resource type")
	}
	if err := dockerRequest(ctx, endpoint, http.MethodDelete, path, nil); err != nil {
		return result, err
	}
	result.Status = "removed"
	result.Message = "Removed this resource."
	return result, nil
}

func dockerSize(size int64) string {
	if size < 0 {
		return "size unavailable"
	}
	if size < 1024 {
		return fmt.Sprintf("%d B", size)
	}
	value := float64(size)
	for _, unit := range []string{"KiB", "MiB", "GiB", "TiB"} {
		value /= 1024
		if value < 1024 || unit == "TiB" {
			return fmt.Sprintf("%.1f %s", value, unit)
		}
	}
	return "size unavailable"
}
