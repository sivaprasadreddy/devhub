package backend

import "context"

// ActivityService exposes hosting-provider activity (pull requests, issues).
type ActivityService struct {
	store    *Store
	provider RemoteProvider
}

// NewActivityService creates a service that loads activity through provider.
func NewActivityService(store *Store, provider RemoteProvider) *ActivityService {
	return &ActivityService{store: store, provider: provider}
}

// IsConnected reports whether the provider has credentials.
func (s *ActivityService) IsConnected(ctx context.Context) bool {
	return s.provider.Connected(ctx)
}

// GetActivity returns open PR and issue counts for all tracked projects.
// Request failures are reported in RemoteActivity.Error so that per-project
// Git status keeps working when GitHub is unreachable.
func (s *ActivityService) GetActivity(ctx context.Context) (RemoteActivity, error) {
	projects, err := s.store.ListProjects()
	if err != nil {
		return RemoteActivity{}, err
	}
	activity, err := s.provider.Activity(ctx, projects)
	if err != nil {
		activity.Error = err.Error()
	}
	return activity, nil
}

// ProjectDetails combines a project's local Git status with its hosting activity.
type ProjectDetails struct {
	Project   Project      `json:"project"`
	Status    GitStatus    `json:"status"`
	Connected bool         `json:"connected"`
	Remote    *RepoDetails `json:"remote"`
	// RemoteError explains why Remote could not be loaded.
	RemoteError string `json:"remoteError"`
}

// GetProjectDetails returns the Git status and open PRs/issues of a project.
func (s *ActivityService) GetProjectDetails(ctx context.Context, id int64) (ProjectDetails, error) {
	project, err := s.store.GetProject(id)
	if err != nil {
		return ProjectDetails{}, err
	}
	details := ProjectDetails{
		Project:   project,
		Status:    readStatus(ctx, project),
		Connected: s.provider.Connected(ctx),
	}
	if details.Connected {
		details.Remote, err = s.provider.Details(ctx, project)
		if err != nil {
			details.RemoteError = err.Error()
		}
	}
	return details, nil
}
