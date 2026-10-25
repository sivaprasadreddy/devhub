package backend

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseGitHubRepo(t *testing.T) {
	cases := []struct {
		url, owner, name string
		ok               bool
	}{
		{"https://github.com/org/repo.git", "org", "repo", true},
		{"https://github.com/org/repo", "org", "repo", true},
		{"git@github.com:org/repo.git", "org", "repo", true},
		{"ssh://git@github.com/org/repo.git", "org", "repo", true},
		{"https://gitlab.com/org/repo.git", "", "", false},
		{"", "", "", false},
	}
	for _, c := range cases {
		owner, name, ok := parseGitHubRepo(c.url)
		if owner != c.owner || name != c.name || ok != c.ok {
			t.Errorf("parseGitHubRepo(%q) = %q, %q, %v", c.url, owner, name, ok)
		}
	}
}

func TestGitHubActivity(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer secret" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var req struct {
			Query     string            `json:"query"`
			Variables map[string]string `json:"variables"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Variables["o0"] != "org" || req.Variables["n1"] != "missing" || !strings.Contains(req.Query, "r1: repository") {
			t.Errorf("unexpected request: %+v", req)
		}
		w.Write([]byte(`{
			"data": {"r0": {"url": "https://github.com/org/repo", "pullRequests": {"totalCount": 3}, "issues": {"totalCount": 5}}, "r1": null},
			"errors": [{"message": "Could not resolve to a Repository", "path": ["r1"]}]
		}`))
	}))
	defer server.Close()

	g := &GitHubProvider{endpoint: server.URL, client: server.Client(), token: func(context.Context) string { return "secret" }}
	projects := []Project{
		{ID: 1, RemoteURL: "git@github.com:org/repo.git"},
		{ID: 2, RemoteURL: "https://github.com/org/missing"},
		{ID: 3, RemoteURL: "https://gitlab.com/org/other"},
	}

	got, err := g.Activity(context.Background(), projects)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Connected || len(got.Repos) != 2 {
		t.Fatalf("unexpected result: %+v", got)
	}
	if r := got.Repos[0]; r.ProjectID != 1 || r.OpenPRs != 3 || r.OpenIssues != 5 || r.Error != "" {
		t.Fatalf("unexpected repo 1: %+v", r)
	}
	if r := got.Repos[1]; r.ProjectID != 2 || r.Error == "" {
		t.Fatalf("expected error for missing repo: %+v", r)
	}

	g.token = func(context.Context) string { return "wrong" }
	if _, err := g.Activity(context.Background(), projects); err == nil {
		t.Fatal("expected error for rejected token")
	}
}

func TestGitHubActivityWithoutToken(t *testing.T) {
	g := &GitHubProvider{token: func(context.Context) string { return "" }}
	got, err := g.Activity(context.Background(), []Project{{ID: 1, RemoteURL: "https://github.com/org/repo"}})
	if err != nil || got.Connected || len(got.Repos) != 0 {
		t.Fatalf("unexpected result: %+v, %v", got, err)
	}
}

func TestGitHubDetails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Query     string         `json:"query"`
			Variables map[string]any `json:"variables"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Variables["owner"] != "org" || req.Variables["name"] != "repo" {
			t.Errorf("unexpected variables: %v", req.Variables)
		}
		if !strings.Contains(req.Query, "pullRequests") {
			w.Write([]byte(`{"data": {"repository": {"issues": {"totalCount": 3, "nodes": [{
				"number": 4, "title": "Crash", "url": "https://github.com/org/repo/issues/4",
				"createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-03T00:00:00Z",
				"author": null, "comments": {"totalCount": 0},
				"labels": {"nodes": []}, "assignees": {"nodes": []}
			}]}}}}`))
			return
		}
		w.Write([]byte(`{"data": {
			"viewer": {"login": "me"},
			"repository": {
				"url": "https://github.com/org/repo",
				"pullRequests": {"totalCount": 7, "nodes": [{
					"number": 12, "title": "Add feature", "url": "https://github.com/org/repo/pull/12",
					"isDraft": true, "createdAt": "2026-01-01T00:00:00Z", "updatedAt": "2026-01-02T00:00:00Z",
					"reviewDecision": "REVIEW_REQUIRED", "headRefName": "feature",
					"author": {"login": "alice"}, "comments": {"totalCount": 2},
					"labels": {"nodes": [{"name": "bug", "color": "d73a4a"}]},
					"assignees": {"nodes": [{"login": "me"}]},
					"reviewRequests": {"nodes": [{"requestedReviewer": {"login": "me"}}, {"requestedReviewer": {}}]},
					"commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": "FAILURE"}}}]}
				}]}
			}
		}}`))
	}))
	defer server.Close()

	g := &GitHubProvider{endpoint: server.URL, client: server.Client(), token: func(context.Context) string { return "secret" }}
	d, err := g.Details(context.Background(), Project{RemoteURL: "git@github.com:org/repo.git"})
	if err != nil {
		t.Fatal(err)
	}
	if d.OpenPRs != 7 || d.OpenIssues != 3 || d.Viewer != "me" || len(d.PullRequests) != 1 || len(d.Issues) != 1 {
		t.Fatalf("unexpected details: %+v", d)
	}
	pr := d.PullRequests[0]
	if !pr.Draft || pr.CIState != "FAILURE" || !pr.ReviewRequested || !pr.AssignedToMe || pr.Mine || pr.Author != "alice" || pr.Labels[0].Name != "bug" {
		t.Fatalf("unexpected PR: %+v", pr)
	}
	if issue := d.Issues[0]; issue.Author != "ghost" || issue.AssignedToMe || issue.Labels == nil {
		t.Fatalf("unexpected issue: %+v", issue)
	}

	if d, err := g.Details(context.Background(), Project{RemoteURL: "https://gitlab.com/org/repo"}); d != nil || err != nil {
		t.Fatalf("expected nil for non-GitHub project, got %+v, %v", d, err)
	}
}
