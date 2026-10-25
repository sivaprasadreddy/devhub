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
