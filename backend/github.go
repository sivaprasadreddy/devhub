package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

const (
	githubGraphQLURL = "https://api.github.com/graphql"
	githubBatchSize  = 50
)

var githubRemotePattern = regexp.MustCompile(`^(?:https?://|ssh://)?(?:[^@/]+@)?github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$`)

// parseGitHubRepo extracts owner and name from a GitHub remote URL.
func parseGitHubRepo(url string) (owner, name string, ok bool) {
	m := githubRemotePattern.FindStringSubmatch(strings.TrimSpace(url))
	if m == nil {
		return "", "", false
	}
	return m[1], m[2], true
}

// GitHubProvider loads pull request and issue counts from the GitHub GraphQL API.
type GitHubProvider struct {
	endpoint string
	client   *http.Client
	token    func(ctx context.Context) string
}

// NewGitHubProvider uses GITHUB_TOKEN / GH_TOKEN, or the GitHub CLI login.
func NewGitHubProvider() *GitHubProvider {
	return &GitHubProvider{
		endpoint: githubGraphQLURL,
		client:   &http.Client{Timeout: 30 * time.Second},
		token:    githubToken,
	}
}

func (g *GitHubProvider) Name() string { return "github" }

func (g *GitHubProvider) Connected(ctx context.Context) bool {
	return g.token(ctx) != ""
}

// githubToken resolves a token from the environment or `gh auth token`.
func githubToken(ctx context.Context) string {
	for _, key := range []string{"GITHUB_TOKEN", "GH_TOKEN"} {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	gh := ghPath()
	if gh == "" {
		return ""
	}
	out, err := exec.CommandContext(ctx, gh, "auth", "token").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// ghPath finds the GitHub CLI. Apps launched from Finder get a minimal PATH,
// so the common Homebrew locations are checked too.
func ghPath() string {
	if p, err := exec.LookPath("gh"); err == nil {
		return p
	}
	for _, p := range []string{"/opt/homebrew/bin/gh", "/usr/local/bin/gh"} {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

type githubRepoRef struct {
	project Project
	owner   string
	name    string
}

// Activity returns open PR and issue counts for every project hosted on GitHub.
func (g *GitHubProvider) Activity(ctx context.Context, projects []Project) (RemoteActivity, error) {
	var refs []githubRepoRef
	for _, p := range projects {
		if owner, name, ok := parseGitHubRepo(p.RemoteURL); ok {
			refs = append(refs, githubRepoRef{project: p, owner: owner, name: name})
		}
	}

	token := g.token(ctx)
	result := RemoteActivity{Connected: token != "", Repos: []RepoActivity{}}
	if token == "" || len(refs) == 0 {
		return result, nil
	}

	for start := 0; start < len(refs); start += githubBatchSize {
		batch := refs[start:min(start+githubBatchSize, len(refs))]
		repos, err := g.fetchBatch(ctx, token, batch)
		if err != nil {
			return result, err
		}
		result.Repos = append(result.Repos, repos...)
	}
	return result, nil
}

type graphQLResponse struct {
	Data   map[string]*githubRepoCounts `json:"data"`
	Errors []struct {
		Message string `json:"message"`
		Path    []any  `json:"path"`
	} `json:"errors"`
}

type githubRepoCounts struct {
	URL          string `json:"url"`
	PullRequests struct {
		TotalCount int `json:"totalCount"`
	} `json:"pullRequests"`
	Issues struct {
		TotalCount int `json:"totalCount"`
	} `json:"issues"`
}

// fetchBatch queries several repositories in one GraphQL request using aliases.
func (g *GitHubProvider) fetchBatch(ctx context.Context, token string, refs []githubRepoRef) ([]RepoActivity, error) {
	var params, fields []string
	vars := map[string]string{}
	for i, r := range refs {
		params = append(params, fmt.Sprintf("$o%d: String!, $n%d: String!", i, i))
		fields = append(fields, fmt.Sprintf(
			"r%d: repository(owner: $o%d, name: $n%d) { url pullRequests(states: OPEN) { totalCount } issues(states: OPEN) { totalCount } }",
			i, i, i))
		vars[fmt.Sprintf("o%d", i)] = r.owner
		vars[fmt.Sprintf("n%d", i)] = r.name
	}
	query := fmt.Sprintf("query(%s) { %s }", strings.Join(params, ", "), strings.Join(fields, " "))

	body, err := json.Marshal(map[string]any{"query": query, "variables": vars})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GitHub request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return nil, errors.New("GitHub rejected the token; run `gh auth login` or update GITHUB_TOKEN")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub returned %s", resp.Status)
	}

	var out graphQLResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("decode GitHub response: %w", err)
	}

	// Errors for individual repositories (e.g. not found) carry the alias as path[0].
	repoErrors := map[string]string{}
	for _, e := range out.Errors {
		if len(e.Path) > 0 {
			if alias, ok := e.Path[0].(string); ok {
				repoErrors[alias] = e.Message
				continue
			}
		}
		if out.Data == nil {
			return nil, fmt.Errorf("GitHub: %s", e.Message)
		}
	}

	activity := make([]RepoActivity, 0, len(refs))
	for i, r := range refs {
		alias := fmt.Sprintf("r%d", i)
		a := RepoActivity{
			ProjectID: r.project.ID,
			Provider:  g.Name(),
			Repo:      r.owner + "/" + r.name,
			WebURL:    "https://github.com/" + r.owner + "/" + r.name,
		}
		if counts := out.Data[alias]; counts != nil {
			a.WebURL = counts.URL
			a.OpenPRs = counts.PullRequests.TotalCount
			a.OpenIssues = counts.Issues.TotalCount
		} else if msg, ok := repoErrors[alias]; ok {
			a.Error = msg
		} else {
			a.Error = "repository not found"
		}
		activity = append(activity, a)
	}
	return activity, nil
}
