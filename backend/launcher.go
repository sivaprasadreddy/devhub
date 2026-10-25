package backend

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"sort"
	"strings"
)

// AppKind groups launchable applications.
type AppKind string

const (
	AppKindTerminal AppKind = "terminal"
	AppKindIDE      AppKind = "ide"
)

// App is an installed macOS application that can open a project directory.
type App struct {
	Name string  `json:"name"`
	Path string  `json:"path"`
	Kind AppKind `json:"kind"`
}

// Known application bundle name prefixes. Prefixes also match variants such as
// "IntelliJ IDEA CE" or "IntelliJ IDEA 2026.3 Nightly".
var appPrefixes = map[AppKind][]string{
	AppKindTerminal: {"Terminal", "iTerm", "Warp", "Ghostty", "Alacritty", "kitty", "WezTerm", "Hyper", "Tabby"},
	AppKindIDE: {
		"Visual Studio Code", "Cursor", "Windsurf", "Zed", "Sublime Text", "Nova", "Xcode", "Android Studio",
		"IntelliJ IDEA", "GoLand", "WebStorm", "PyCharm", "Rider", "CLion", "RustRover", "PhpStorm",
		"RubyMine", "DataGrip", "Fleet", "Aqua",
	},
}

// appDirs returns the directories searched for applications.
func appDirs() []string {
	dirs := []string{"/Applications", "/System/Applications", "/System/Applications/Utilities", "/Applications/Utilities"}
	if home, err := os.UserHomeDir(); err == nil {
		dirs = append(dirs, filepath.Join(home, "Applications"))
	}
	return dirs
}

// findApps lists installed applications of kind found in dirs.
func findApps(kind AppKind, dirs []string) []App {
	seen := map[string]bool{}
	apps := []App{}
	for _, dir := range dirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			name, ok := strings.CutSuffix(e.Name(), ".app")
			if !ok || seen[name] || !matchesPrefix(name, appPrefixes[kind]) {
				continue
			}
			seen[name] = true
			apps = append(apps, App{Name: name, Path: filepath.Join(dir, e.Name()), Kind: kind})
		}
	}
	sort.Slice(apps, func(i, j int) bool { return strings.ToLower(apps[i].Name) < strings.ToLower(apps[j].Name) })
	return apps
}

func matchesPrefix(name string, prefixes []string) bool {
	for _, p := range prefixes {
		if name == p || strings.HasPrefix(name, p+" ") {
			return true
		}
	}
	return false
}

// openWith opens dir in the application at appPath, or in Finder if appPath is "".
func openWith(ctx context.Context, appPath, dir string) error {
	if _, err := os.Stat(dir); err != nil {
		return fmt.Errorf("%s does not exist", dir)
	}
	args := []string{dir}
	if appPath != "" {
		args = []string{"-a", appPath, dir}
	}
	if out, err := exec.CommandContext(ctx, "open", args...).CombinedOutput(); err != nil {
		if msg := strings.TrimSpace(string(out)); msg != "" {
			return fmt.Errorf("open failed: %s", msg)
		}
		return err
	}
	return nil
}

// containsApp reports whether apps includes an app at path.
func containsApp(apps []App, path string) bool {
	return slices.ContainsFunc(apps, func(a App) bool { return a.Path == path })
}
