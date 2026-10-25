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
	store    *Store
	dirs     []string
	iconsDir string
}

// NewLauncherService creates a service that stores preferences in store.
func NewLauncherService(store *Store) *LauncherService {
	return &LauncherService{store: store, dirs: appDirs(), iconsDir: appIconCacheDir()}
}

// ListTerminals returns installed terminal applications with their icons.
func (s *LauncherService) ListTerminals() []App {
	return s.withIcons(findApps(AppKindTerminal, s.dirs))
}

// ListIDEs returns installed IDEs and editors with their icons.
func (s *LauncherService) ListIDEs() []App {
	return s.withIcons(findApps(AppKindIDE, s.dirs))
}

func (s *LauncherService) withIcons(apps []App) []App {
	for i := range apps {
		apps[i].Icon = appIconDataURL(apps[i].Path, s.iconsDir)
	}
	return apps
}

// GetPreferences returns the preferred apps. Unset or uninstalled preferences
// fall back to macOS Terminal and the first installed IDE.
func (s *LauncherService) GetPreferences() (Preferences, error) {
	terminal, err := s.preferred(settingTerminal, findApps(AppKindTerminal, s.dirs), "Terminal")
	if err != nil {
		return Preferences{}, err
	}
	ide, err := s.preferred(settingIDE, findApps(AppKindIDE, s.dirs), "")
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
	if p.Terminal != "" && !containsApp(findApps(AppKindTerminal, s.dirs), p.Terminal) {
		return fmt.Errorf("unknown terminal %s", p.Terminal)
	}
	if p.IDE != "" && !containsApp(findApps(AppKindIDE, s.dirs), p.IDE) {
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
	if !containsApp(findApps(AppKindIDE, s.dirs), appPath) && !containsApp(findApps(AppKindTerminal, s.dirs), appPath) {
		return fmt.Errorf("unknown application %s", appPath)
	}
	return openWith(ctx, appPath, dir)
}
