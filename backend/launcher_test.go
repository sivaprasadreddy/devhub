package backend

import (
	"os"
	"path/filepath"
	"testing"
)

func fakeApps(t *testing.T, names ...string) string {
	t.Helper()
	dir := t.TempDir()
	for _, n := range names {
		if err := os.Mkdir(filepath.Join(dir, n), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func TestFindApps(t *testing.T) {
	dir := fakeApps(t, "Zed.app", "IntelliJ IDEA.app", "IntelliJ IDEA 2026.3 Nightly.app",
		"Cloudflare WARP.app", "Warp.app", "Terminal.app", "Zedify.app", "notes.txt")

	var ides []string
	for _, a := range findApps(AppKindIDE, []string{dir}) {
		ides = append(ides, a.Name)
	}
	want := []string{"IntelliJ IDEA", "IntelliJ IDEA 2026.3 Nightly", "Zed"}
	if len(ides) != len(want) {
		t.Fatalf("ides = %v, want %v", ides, want)
	}
	for i := range want {
		if ides[i] != want[i] {
			t.Fatalf("ides = %v, want %v", ides, want)
		}
	}

	terms := findApps(AppKindTerminal, []string{dir})
	if len(terms) != 2 || terms[0].Name != "Terminal" || terms[1].Name != "Warp" {
		t.Fatalf("terminals = %+v", terms)
	}
}

func TestPreferences(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	dir := fakeApps(t, "iTerm.app", "Terminal.app", "GoLand.app", "Zed.app")
	s := &LauncherService{store: store, dirs: []string{dir}}

	prefs, err := s.GetPreferences()
	if err != nil {
		t.Fatal(err)
	}
	if prefs.Terminal != filepath.Join(dir, "Terminal.app") || prefs.IDE != filepath.Join(dir, "GoLand.app") {
		t.Fatalf("unexpected defaults: %+v", prefs)
	}

	want := Preferences{Terminal: filepath.Join(dir, "iTerm.app"), IDE: filepath.Join(dir, "Zed.app")}
	if err := s.SavePreferences(want); err != nil {
		t.Fatal(err)
	}
	if got, _ := s.GetPreferences(); got != want {
		t.Fatalf("got %+v, want %+v", got, want)
	}

	if err := s.SavePreferences(Preferences{IDE: "/bin/sh"}); err == nil {
		t.Fatal("expected error for unknown app")
	}
}
