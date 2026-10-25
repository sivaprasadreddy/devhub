package backend

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// ProjectService manages the persisted list of projects.
type ProjectService struct {
	mu       sync.Mutex
	filePath string
}

// NewProjectService stores projects in the user's config directory.
func NewProjectService() (*ProjectService, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	return &ProjectService{filePath: filepath.Join(dir, "devhub", "projects.json")}, nil
}

// ListProjects returns all tracked projects.
func (s *ProjectService) ListProjects() ([]Project, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.load()
}

func (s *ProjectService) load() ([]Project, error) {
	data, err := os.ReadFile(s.filePath)
	if errors.Is(err, os.ErrNotExist) {
		return []Project{}, nil
	}
	if err != nil {
		return nil, err
	}
	projects := []Project{}
	if err := json.Unmarshal(data, &projects); err != nil {
		return nil, err
	}
	return projects, nil
}
