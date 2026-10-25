package backend

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ProjectService manages the tracked projects.
type ProjectService struct {
	store *Store
}

// NewProjectService creates a service backed by store.
func NewProjectService(store *Store) *ProjectService {
	return &ProjectService{store: store}
}

// ListProjects returns all tracked projects.
func (s *ProjectService) ListProjects() ([]Project, error) {
	return s.store.ListProjects()
}

// SelectDirectory shows a native folder picker and returns the chosen path,
// or "" if the user cancelled.
func (s *ProjectService) SelectDirectory(title string) (string, error) {
	return application.Get().Dialog.OpenFile().
		SetTitle(title).
		CanChooseFiles(false).
		CanChooseDirectories(true).
		CanCreateDirectories(true).
		PromptForSingleSelection()
}

// AddLocalProject tracks the existing Git repository at dir.
func (s *ProjectService) AddLocalProject(ctx context.Context, dir string) (*Project, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, errors.New("select a directory")
	}
	root, err := repoRoot(ctx, dir)
	if err != nil {
		return nil, err
	}
	p := &Project{
		Name:      filepath.Base(root),
		Path:      root,
		RemoteURL: remoteURL(ctx, root),
	}
	if err := s.store.InsertProject(p); err != nil {
		return nil, err
	}
	return p, nil
}

// CloneProject clones url into a new directory under parentDir and tracks it.
func (s *ProjectService) CloneProject(ctx context.Context, url, parentDir string) (*Project, error) {
	url = strings.TrimSpace(url)
	if url == "" {
		return nil, errors.New("enter a repository URL")
	}
	if strings.TrimSpace(parentDir) == "" {
		return nil, errors.New("select a destination directory")
	}
	name := repoNameFromURL(url)
	if name == "" || name == "." {
		return nil, fmt.Errorf("cannot derive a directory name from %q", url)
	}
	dest := filepath.Join(parentDir, name)
	if _, err := os.Stat(dest); err == nil {
		return nil, fmt.Errorf("%s already exists", dest)
	}
	if err := gitClone(ctx, url, dest); err != nil {
		return nil, err
	}
	return s.AddLocalProject(ctx, dest)
}

// RemoveProject stops tracking a project. Files on disk are left untouched.
func (s *ProjectService) RemoveProject(id int64) error {
	return s.store.DeleteProject(id)
}
