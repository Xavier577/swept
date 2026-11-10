package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"swept/internal/cleaner"
	"swept/internal/managed"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}
	engine, err := cleaner.New(home, filepath.Join(home, "Library/Application Support/Swept"))
	if err != nil {
		log.Fatal(err)
	}
	service := &Service{engine: engine, managed: managed.New()}
	application.RegisterEvent[cleaner.Progress]("scan-progress")
	application.RegisterEvent[ScanFinished]("scan-finished")
	app := application.New(application.Options{
		Name: "Swept", SingleInstance: &application.SingleInstanceOptions{UniqueID: "com.swept.app"}, Description: "A little room to build.",
		ShouldQuit: func() bool { return !service.cleaning.Load() },
		Services:   []application.Service{application.NewService(service)},
		Assets:     application.AssetOptions{Handler: application.AssetFileServerFS(assets)},
		Mac:        application.MacOptions{ApplicationShouldTerminateAfterLastWindowClosed: true},
	})
	service.app = app
	service.notify = func(name string, data any) { app.Event.Emit(name, data) }
	window := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Swept", Width: 1220, Height: 820, MinWidth: 960, MinHeight: 680,
		Mac:              application.MacWindow{InvisibleTitleBarHeight: 38, Backdrop: application.MacBackdropNormal, TitleBar: application.MacTitleBarHiddenInset},
		BackgroundColour: application.NewRGB(246, 248, 251), URL: "/",
	})
	window.RegisterHook(events.Common.WindowClosing, func(event *application.WindowEvent) {
		if service.cleaning.Load() {
			event.Cancel()
		}
	})
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
