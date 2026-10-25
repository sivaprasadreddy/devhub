package backend

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sync"
	"time"
)

// How many of the most recently updated open PRs and issues are loaded. The PR
// query includes per-commit check status, which is expensive for GitHub to
// resolve, so it uses a smaller page to stay within GitHub's query timeout.
const (
	githubPRLimit    = 25
	githubIssueLimit = 50
)

const githubPullRequestsQuery = `query($owner: String!, $name: String!, $limit: Int!) {
  viewer { login }
  repository(owner: $owner, name: $name) {
    url
    pullRequests(states: OPEN, first: $limit, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number title url isDraft createdAt updatedAt reviewDecision headRefName
        author { login }
        comments { totalCount }
        labels(first: 10) { nodes { name color } }
        assignees(first: 10) { nodes { login } }
        reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } } } }
        commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
      }
    }
  }
}`

const githubIssuesQuery = `query($owner: String!, $name: String!, $limit: Int!) {
  repository(owner: $owner, name: $name) {
    issues(states: OPEN, first: $limit, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number title url createdAt updatedAt
        author { login }
        comments { totalCount }
        labels(first: 10) { nodes { name color } }
        assignees(first: 10) { nodes { login } }
      }
    }
  }
}`

type ghLogin struct {
	Login string `json:"login"`
}

type ghLabels struct {
	Nodes []Label `json:"nodes"`
}

type ghAssignees struct {
	Nodes []ghLogin `json:"nodes"`
}

type ghCount struct {
	TotalCount int `json:"totalCount"`
}

type ghDetailsResponse struct {
	Data *struct {
		Viewer     ghLogin `json:"viewer"`
		Repository *struct {
			URL          string `json:"url"`
			PullRequests struct {
				TotalCount int `json:"totalCount"`
				Nodes      []struct {
					Number         int         `json:"number"`
					Title          string      `json:"title"`
					URL            string      `json:"url"`
					IsDraft        bool        `json:"isDraft"`
					CreatedAt      time.Time   `json:"createdAt"`
					UpdatedAt      time.Time   `json:"updatedAt"`
					ReviewDecision string      `json:"reviewDecision"`
					HeadRefName    string      `json:"headRefName"`
					Author         *ghLogin    `json:"author"`
					Comments       ghCount     `json:"comments"`
					Labels         ghLabels    `json:"labels"`
					Assignees      ghAssignees `json:"assignees"`
					ReviewRequests struct {
						Nodes []struct {
							RequestedReviewer *ghLogin `json:"requestedReviewer"`
						} `json:"nodes"`
					} `json:"reviewRequests"`
					Commits struct {
						Nodes []struct {
							Commit struct {
								StatusCheckRollup *struct {
									State string `json:"state"`
								} `json:"statusCheckRollup"`
							} `json:"commit"`
						} `json:"nodes"`
					} `json:"commits"`
				} `json:"nodes"`
			} `json:"pullRequests"`
			Issues struct {
				TotalCount int `json:"totalCount"`
				Nodes      []struct {
					Number    int         `json:"number"`
					Title     string      `json:"title"`
					URL       string      `json:"url"`
					CreatedAt time.Time   `json:"createdAt"`
					UpdatedAt time.Time   `json:"updatedAt"`
					Author    *ghLogin    `json:"author"`
					Comments  ghCount     `json:"comments"`
					Labels    ghLabels    `json:"labels"`
					Assignees ghAssignees `json:"assignees"`
				} `json:"nodes"`
			} `json:"issues"`
		} `json:"repository"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// Details loads the most recently updated open PRs and issues of a GitHub project.
func (g *GitHubProvider) Details(ctx context.Context, project Project) (*RepoDetails, error) {
	owner, name, ok := parseGitHubRepo(project.RemoteURL)
	if !ok {
		return nil, nil
	}
	token := g.token(ctx)
	if token == "" {
		return nil, errors.New("GitHub is not connected")
	}

	// PRs and issues are fetched concurrently as separate queries.
	var prOut, issueOut ghDetailsResponse
	var issueErr error
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		vars := map[string]any{"owner": owner, "name": name, "limit": githubIssueLimit}
		issueErr = g.postGraphQL(ctx, token, githubIssuesQuery, vars, &issueOut)
	}()
	vars := map[string]any{"owner": owner, "name": name, "limit": githubPRLimit}
	prErr := g.postGraphQL(ctx, token, githubPullRequestsQuery, vars, &prOut)
	wg.Wait()

	for _, r := range []struct {
		out *ghDetailsResponse
		err error
	}{{&prOut, prErr}, {&issueOut, issueErr}} {
		if r.err != nil {
			return nil, r.err
		}
		if r.out.Data == nil || r.out.Data.Repository == nil {
			if len(r.out.Errors) > 0 {
				return nil, fmt.Errorf("GitHub: %s", r.out.Errors[0].Message)
			}
			return nil, fmt.Errorf("repository %s/%s not found", owner, name)
		}
	}

	repo := prOut.Data.Repository
	issues := issueOut.Data.Repository.Issues
	viewer := prOut.Data.Viewer.Login
	details := &RepoDetails{
		Repo:         owner + "/" + name,
		WebURL:       repo.URL,
		Viewer:       viewer,
		OpenPRs:      repo.PullRequests.TotalCount,
		OpenIssues:   issues.TotalCount,
		PullRequests: []PullRequest{},
		Issues:       []Issue{},
	}

	for _, n := range repo.PullRequests.Nodes {
		pr := PullRequest{
			Number:         n.Number,
			Title:          n.Title,
			URL:            n.URL,
			Author:         login(n.Author),
			Branch:         n.HeadRefName,
			Draft:          n.IsDraft,
			CreatedAt:      n.CreatedAt,
			UpdatedAt:      n.UpdatedAt,
			Comments:       n.Comments.TotalCount,
			Labels:         nonNilLabels(n.Labels.Nodes),
			Assignees:      logins(n.Assignees.Nodes),
			ReviewDecision: n.ReviewDecision,
		}
		pr.Mine = viewer != "" && pr.Author == viewer
		pr.AssignedToMe = viewer != "" && slices.Contains(pr.Assignees, viewer)
		for _, r := range n.ReviewRequests.Nodes {
			if viewer != "" && login(r.RequestedReviewer) == viewer {
				pr.ReviewRequested = true
			}
		}
		if len(n.Commits.Nodes) > 0 && n.Commits.Nodes[0].Commit.StatusCheckRollup != nil {
			pr.CIState = n.Commits.Nodes[0].Commit.StatusCheckRollup.State
		}
		details.PullRequests = append(details.PullRequests, pr)
	}

	for _, n := range issues.Nodes {
		issue := Issue{
			Number:    n.Number,
			Title:     n.Title,
			URL:       n.URL,
			Author:    login(n.Author),
			CreatedAt: n.CreatedAt,
			UpdatedAt: n.UpdatedAt,
			Comments:  n.Comments.TotalCount,
			Labels:    nonNilLabels(n.Labels.Nodes),
			Assignees: logins(n.Assignees.Nodes),
		}
		issue.AssignedToMe = viewer != "" && slices.Contains(issue.Assignees, viewer)
		details.Issues = append(details.Issues, issue)
	}
	return details, nil
}

// login returns the login of a possibly deleted ("ghost") user.
func login(l *ghLogin) string {
	if l == nil || l.Login == "" {
		return "ghost"
	}
	return l.Login
}

func logins(nodes []ghLogin) []string {
	out := make([]string, 0, len(nodes))
	for _, n := range nodes {
		out = append(out, n.Login)
	}
	return out
}

func nonNilLabels(labels []Label) []Label {
	if labels == nil {
		return []Label{}
	}
	return labels
}
