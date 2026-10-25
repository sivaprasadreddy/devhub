package backend

import (
	"context"
	"errors"
	"os/exec"
	"path/filepath"
	"testing"
)

func newTestService(t *testing.T) *ProjectService {
	t.Helper()
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { store.Close() })
	return NewProjectService(store)
}

func initRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	for _, args := range [][]string{
		{"init", "-q"},
		{"remote", "add", "origin", "https://github.com/example/demo.git"},
		{"-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init"},
	} {
		if out, err := exec.Command("git", append([]string{"-C", dir}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	root, err := repoRoot(context.Background(), dir)
	if err != nil {
		t.Fatal(err)
	}
	return root
}

func TestAddLocalProject(t *testing.T) {
	s := newTestService(t)
	repo := initRepo(t)

	p, err := s.AddLocalProject(context.Background(), repo)
	if err != nil {
		t.Fatal(err)
	}
	if p.Path != repo || p.Name != filepath.Base(repo) || p.RemoteURL != "https://github.com/example/demo.git" {
		t.Fatalf("unexpected project: %+v", p)
	}

	if _, err := s.AddLocalProject(context.Background(), repo); !errors.Is(err, ErrProjectExists) {
		t.Fatalf("want ErrProjectExists, got %v", err)
	}

	list, err := s.ListProjects()
	if err != nil || len(list) != 1 {
		t.Fatalf("want 1 project, got %v (%v)", list, err)
	}

	if err := s.RemoveProject(p.ID); err != nil {
		t.Fatal(err)
	}
	if list, _ := s.ListProjects(); len(list) != 0 {
		t.Fatalf("want 0 projects, got %v", list)
	}
}

func TestAddLocalProjectRejectsNonRepo(t *testing.T) {
	s := newTestService(t)
	if _, err := s.AddLocalProject(context.Background(), t.TempDir()); err == nil {
		t.Fatal("expected error for non-repository directory")
	}
}

func TestCloneProject(t *testing.T) {
	s := newTestService(t)
	src := initRepo(t)
	parent := t.TempDir()

	p, err := s.CloneProject(context.Background(), src, parent)
	if err != nil {
		t.Fatal(err)
	}
	if p.Name != filepath.Base(src) || p.RemoteURL != src {
		t.Fatalf("unexpected project: %+v", p)
	}

	if _, err := s.CloneProject(context.Background(), src, parent); err == nil {
		t.Fatal("expected error when destination exists")
	}
}

func TestRepoNameFromURL(t *testing.T) {
	cases := map[string]string{
		"https://github.com/org/repo.git":  "repo",
		"https://github.com/org/repo/":     "repo",
		"git@github.com:org/repo.git":      "repo",
		"ssh://git@host:22/group/sub/repo": "repo",
	}
	for in, want := range cases {
		if got := repoNameFromURL(in); got != want {
			t.Errorf("repoNameFromURL(%q) = %q, want %q", in, got, want)
		}
	}
}
