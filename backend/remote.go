package backend

import (
	"context"
	"time"
)

// RepoActivity is the hosting-provider activity of a project.
type RepoActivity struct {
	ProjectID  int64  `json:"projectId"`
	Provider   string `json:"provider"`
	Repo       string `json:"repo"`
	WebURL     string `json:"webUrl"`
	OpenPRs    int    `json:"openPrs"`
	OpenIssues int    `json:"openIssues"`
	Error      string `json:"error"`
}

// RemoteActivity is the result of loading activity for all projects.
type RemoteActivity struct {
	// Connected reports whether the provider has credentials.
	Connected bool           `json:"connected"`
	Error     string         `json:"error"`
	Repos     []RepoActivity `json:"repos"`
}

// RemoteProvider loads activity from a Git hosting service. Implementations
// skip projects whose remote they do not host.
type RemoteProvider interface {
	Name() string
	Connected(ctx context.Context) bool
	Activity(ctx context.Context, projects []Project) (RemoteActivity, error)
	// Details returns open pull requests and issues for a project, or nil if
	// the project is not hosted by this provider.
	Details(ctx context.Context, project Project) (*RepoDetails, error)
}

// Label is a pull request or issue label.
type Label struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// PullRequest is an open pull request.
type PullRequest struct {
	Number    int       `json:"number"`
	Title     string    `json:"title"`
	URL       string    `json:"url"`
	Author    string    `json:"author"`
	Branch    string    `json:"branch"`
	Draft     bool      `json:"draft"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Comments  int       `json:"comments"`
	Labels    []Label   `json:"labels"`
	Assignees []string  `json:"assignees"`
	// ReviewDecision is APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED or "".
	ReviewDecision string `json:"reviewDecision"`
	// CIState is the combined check state of the head commit: SUCCESS,
	// FAILURE, ERROR, PENDING, EXPECTED or "" when there are no checks.
	CIState string `json:"ciState"`
	// ReviewRequested reports whether the signed-in user is a requested reviewer.
	ReviewRequested bool `json:"reviewRequested"`
	AssignedToMe    bool `json:"assignedToMe"`
	Mine            bool `json:"mine"`
}

// Issue is an open issue.
type Issue struct {
	Number       int       `json:"number"`
	Title        string    `json:"title"`
	URL          string    `json:"url"`
	Author       string    `json:"author"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	Comments     int       `json:"comments"`
	Labels       []Label   `json:"labels"`
	Assignees    []string  `json:"assignees"`
	AssignedToMe bool      `json:"assignedToMe"`
}

// RepoDetails lists the most recently updated open pull requests and issues.
type RepoDetails struct {
	Repo         string        `json:"repo"`
	WebURL       string        `json:"webUrl"`
	Viewer       string        `json:"viewer"`
	OpenPRs      int           `json:"openPrs"`
	OpenIssues   int           `json:"openIssues"`
	PullRequests []PullRequest `json:"pullRequests"`
	Issues       []Issue       `json:"issues"`
}
