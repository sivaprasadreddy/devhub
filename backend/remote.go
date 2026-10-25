package backend

import "context"

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
}
