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
