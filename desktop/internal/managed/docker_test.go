package managed

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func dockerFixture(t *testing.T, handler http.HandlerFunc) string {
	t.Helper()
	dir, err := os.MkdirTemp("/tmp", "swept-docker-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	socket := filepath.Join(dir, "engine.sock")
	listener, err := net.Listen("unix", socket)
	if err != nil {
		t.Fatal(err)
	}
	server := &http.Server{Handler: handler}
	go server.Serve(listener)
	t.Cleanup(func() { server.Close() })
	return "unix://" + socket
}

func TestDockerCleanupRemovesOnlyReviewedResource(t *testing.T) {
	for _, scenario := range []struct{ kind, id, inventory, path string }{
		{"container", "selected-container", `{"Containers":[{"Id":"selected-container","State":"exited"},{"Id":"other-container","State":"exited"}]}`, "/containers/selected-container"},
		{"volume", "selected-volume", `{"Volumes":[{"Name":"selected-volume","CreatedAt":"original","Driver":"local","UsageData":{"RefCount":0}},{"Name":"other-volume","Driver":"local","UsageData":{"RefCount":0}}]}`, "/volumes/selected-volume"},
		{"image", "sha256:selected", `{"Images":[{"Id":"sha256:selected","Containers":0},{"Id":"sha256:other","Containers":0}]}`, "/images/sha256:selected?noprune=true"},
	} {
		t.Run(scenario.kind, func(t *testing.T) {
			var requests []string
			endpoint := dockerFixture(t, func(w http.ResponseWriter, r *http.Request) {
				requests = append(requests, r.Method+" "+r.URL.RequestURI())
				if r.Method == "GET" {
					w.Write([]byte(scenario.inventory))
					return
				}
				w.WriteHeader(http.StatusNoContent)
			})
			inventory, err := readDocker(context.Background(), endpoint)
			if err != nil {
				t.Fatal(err)
			}
			_, targets := dockerActions(inventory)
			var selected dockerTarget
			for _, target := range targets {
				if target.id == scenario.id {
					selected = target
				}
			}
			if _, err = cleanDockerTarget(context.Background(), endpoint, selected); err != nil {
				t.Fatal(err)
			}
			want := []string{"GET /system/df", "GET /system/df", "DELETE " + scenario.path}
			if !reflect.DeepEqual(requests, want) {
				t.Fatalf("cleanup affected unexpected resources: %v", requests)
			}
		})
	}
}

func TestDockerKeepsResourcesThatChangedAfterReview(t *testing.T) {
	for _, scenario := range []struct {
		name, inventory string
		target          dockerTarget
	}{
		{"container started", `{"Containers":[{"Id":"selected","State":"running"}]}`, dockerTarget{kind: "container", id: "selected"}},
		{"volume referenced", `{"Volumes":[{"Name":"selected","CreatedAt":"original","Driver":"local","UsageData":{"RefCount":1}}]}`, dockerTarget{kind: "volume", id: "selected", revision: "original"}},
		{"volume replaced", `{"Volumes":[{"Name":"selected","CreatedAt":"replacement","Driver":"local","UsageData":{"RefCount":0}}]}`, dockerTarget{kind: "volume", id: "selected", revision: "original"}},
		{"image tagged", `{"Images":[{"Id":"selected","RepoTags":["project:keep"],"Containers":0}]}`, dockerTarget{kind: "image", id: "selected"}},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			mutated := false
			endpoint := dockerFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "GET" {
					mutated = true
				}
				w.Write([]byte(scenario.inventory))
			})
			if _, err := cleanDockerTarget(context.Background(), endpoint, scenario.target); err == nil {
				t.Fatal("expected changed-resource refusal")
			}
			if mutated {
				t.Fatal("cleanup mutated a changed resource")
			}
		})
	}
}

func TestDockerCacheCleanupIsRestrictedToReviewedRecord(t *testing.T) {
	var filters map[string][]string
	endpoint := dockerFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			w.Write([]byte(`{"BuildCache":[{"ID":"selected","CreatedAt":"created","LastUsedAt":"used"},{"ID":"other"}]}`))
			return
		}
		if r.Method != "POST" || r.URL.Path != "/build/prune" {
			t.Errorf("unexpected mutation: %s %s", r.Method, r.URL)
		}
		if err := json.Unmarshal([]byte(r.URL.Query().Get("filters")), &filters); err != nil {
			t.Error(err)
		}
		w.Write([]byte(`{"CachesDeleted":["selected"],"SpaceReclaimed":1024}`))
	})
	_, err := cleanDockerTarget(context.Background(), endpoint, dockerTarget{kind: "cache", id: "selected", revision: "created/used"})
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(filters, map[string][]string{"id": {"selected"}}) {
		t.Fatalf("cache cleanup must be scoped to the reviewed record: %v", filters)
	}
}

func TestDockerBatchRechecksEachSelectionAndReportsMixedOutcomes(t *testing.T) {
	mutations := make(chan string, 8)
	requests := 0
	endpoint := dockerFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			requests++
			state := "exited"
			if requests > 1 {
				state = "running"
			}
			fmt.Fprintf(w, `{"Containers":[{"Id":"started","Names":["/started"],"State":%q},{"Id":"selected","Names":["/selected"],"State":"exited"},{"Id":"unselected","State":"exited"}],"BuildCache":[{"ID":"cache","Description":"test cache","CreatedAt":"created","LastUsedAt":"used"}]}`, state)
			return
		}
		mutations <- r.Method + " " + r.URL.Path
		if r.URL.Path == "/build/prune" {
			w.Write([]byte(`{"CachesDeleted":[],"SpaceReclaimed":0}`))
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	inventory, err := readDocker(context.Background(), endpoint)
	if err != nil {
		t.Fatal(err)
	}
	actions, targets := dockerActions(inventory)
	manager := New()
	manager.plans["preview"] = plan{report: Report{ID: "preview", Tool: "docker", Endpoint: endpoint, At: time.Now(), Actions: actions}, dockerTargets: targets}
	var ids []string
	for _, action := range actions {
		if targets[action.ID].id != "unselected" {
			ids = append(ids, action.ID)
		}
	}
	ids = append(ids, ids[0]) // A repeated ID must never execute twice.
	result, err := manager.Execute(context.Background(), "preview", ids, "CLEAN")
	if err != nil {
		t.Fatal(err)
	}
	var statuses []string
	for _, outcome := range result.Outcomes {
		statuses = append(statuses, outcome.Status)
	}
	if !reflect.DeepEqual(statuses, []string{"attention", "removed", "kept"}) {
		t.Fatalf("unexpected outcomes: %+v", result.Outcomes)
	}
	if !strings.Contains(result.Outcomes[0].Message, "now in use") {
		t.Fatalf("missing useful refusal: %+v", result.Outcomes[0])
	}
	var got []string
	for len(mutations) > 0 {
		got = append(got, <-mutations)
	}
	if !reflect.DeepEqual(got, []string{"DELETE /containers/selected", "POST /build/prune"}) {
		t.Fatalf("batch touched an unselected or changed resource: %v", got)
	}
	if _, err = manager.Execute(context.Background(), "preview", ids, "CLEAN"); err == nil {
		t.Fatal("consumed preview was reused")
	}
}

func TestDockerBatchRejectsInvalidReviewBeforeAnyDeletion(t *testing.T) {
	for _, scenario := range []struct {
		name         string
		ids          []string
		confirmation string
		age          time.Duration
	}{
		{"unreviewed resource", []string{"selected", "unknown"}, "CLEAN", 0},
		{"empty selection", nil, "CLEAN", 0},
		{"no confirmation", []string{"selected"}, "", 0},
		{"expired preview", []string{"selected"}, "CLEAN", 11 * time.Minute},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			calls := make(chan string, 1)
			endpoint := dockerFixture(t, func(w http.ResponseWriter, r *http.Request) {
				calls <- r.Method
				w.WriteHeader(http.StatusInternalServerError)
			})
			manager := New()
			manager.plans["preview"] = plan{report: Report{Tool: "docker", Endpoint: endpoint, At: time.Now().Add(-scenario.age), Actions: []Action{{ID: "selected"}}}, dockerTargets: map[string]dockerTarget{"selected": {kind: "container", id: "selected"}}}
			if _, err := manager.Execute(context.Background(), "preview", scenario.ids, scenario.confirmation); err == nil {
				t.Fatal("invalid review was accepted")
			}
			if len(calls) != 0 {
				t.Fatal("invalid review contacted the engine")
			}
		})
	}
}
