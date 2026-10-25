package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"devhub/backend"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		log.Fatal(err)
	}
	store, err := backend.OpenStore(filepath.Join(configDir, "devhub", "devhub.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()
	projectService := backend.NewProjectService(store)
	settingsService := backend.NewSettingsService(store)
	launcherService := backend.NewLauncherService(store)
	activityService := backend.NewActivityService(store, backend.NewGitHubProvider())

	app := application.New(application.Options{
		Name:        "DevHub",
		Description: "Manage multiple software projects from one place",
		Services: []application.Service{
			application.NewService(projectService),
			application.NewService(activityService),
			application.NewService(launcherService),
			application.NewService(settingsService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "DevHub",
		Width:     1280,
		Height:    800,
		MinWidth:  960,
		MinHeight: 600,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 52,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		// Translucent so the native backdrop (which follows the macOS appearance)
		// shows while the page loads, avoiding a dark flash in light mode.
		BackgroundType: application.BackgroundTypeTranslucent,
		URL:            "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
