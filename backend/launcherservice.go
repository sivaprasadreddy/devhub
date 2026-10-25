package backend

import (
	"context"
	"fmt"
)

const (
	settingTerminal = "preferred_terminal"
	settingIDE      = "preferred_ide"
)

// Preferences holds the user's preferred applications, by app path.
type Preferences struct {
	Terminal string `json:"terminal"`
	IDE      string `json:"ide"`
}

// LauncherService opens projects in Finder, terminals and IDEs.
type LauncherService struct {
	store *Store
	dirs  []string
}

// NewLauncherService creates a service that stores preferences in store.
func NewLauncherService(store *Store) *LauncherService {
	return &LauncherService{store: store, dirs: appDirs()}
}

// ListTerminals returns installed terminal applications.
func (s *LauncherService) ListTerminals() []App {
	return findApps(AppKindTerminal, s.dirs)
}

// ListIDEs returns installed IDEs and editors.
func (s *LauncherService) ListIDEs() []App {
	return findApps(AppKindIDE, s.dirs)
}

// GetPreferences returns the preferred apps. Unset or uninstalled preferences
// fall back to macOS Terminal and the first installed IDE.
func (s *LauncherService) GetPreferences() (Preferences, error) {
	terminal, err := s.preferred(settingTerminal, s.ListTerminals(), "Terminal")
	if err != nil {
		return Preferences{}, err
	}
	ide, err := s.preferred(settingIDE, s.ListIDEs(), "")
	if err != nil {
		return Preferences{}, err
	}
	return Preferences{Terminal: terminal, IDE: ide}, nil
}

func (s *LauncherService) preferred(key string, apps []App, fallbackName string) (string, error) {
	path, err := s.store.GetSetting(key)
	if err != nil {
		return "", err
	}
	if containsApp(apps, path) {
		return path, nil
	}
	for _, a := range apps {
		if a.Name == fallbackName {
			return a.Path, nil
		}
	}
	if len(apps) > 0 {
		return apps[0].Path, nil
	}
	return "", nil
}

// SavePreferences stores the preferred apps.
func (s *LauncherService) SavePreferences(p Preferences) error {
	if p.Terminal != "" && !containsApp(s.ListTerminals(), p.Terminal) {
		return fmt.Errorf("unknown terminal %s", p.Terminal)
	}
	if p.IDE != "" && !containsApp(s.ListIDEs(), p.IDE) {
		return fmt.Errorf("unknown IDE %s", p.IDE)
	}
	if err := s.store.SetSetting(settingTerminal, p.Terminal); err != nil {
		return err
	}
	return s.store.SetSetting(settingIDE, p.IDE)
}

// OpenInFinder reveals the project directory in Finder.
func (s *LauncherService) OpenInFinder(ctx context.Context, dir string) error {
	return openWith(ctx, "", dir)
}

// OpenInTerminal opens dir in the preferred terminal.
func (s *LauncherService) OpenInTerminal(ctx context.Context, dir string) error {
	prefs, err := s.GetPreferences()
	if err != nil {
		return err
	}
	if prefs.Terminal == "" {
		return fmt.Errorf("no terminal application found")
	}
	return openWith(ctx, prefs.Terminal, dir)
}

// OpenInApp opens dir in the given installed IDE or terminal.
func (s *LauncherService) OpenInApp(ctx context.Context, appPath, dir string) error {
	if !containsApp(s.ListIDEs(), appPath) && !containsApp(s.ListTerminals(), appPath) {
		return fmt.Errorf("unknown application %s", appPath)
	}
	return openWith(ctx, appPath, dir)
}
