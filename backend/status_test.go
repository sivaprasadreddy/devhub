package backend

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func git(t *testing.T, dir string, args ...string) {
	t.Helper()
	args = append([]string{"-C", dir, "-c", "user.name=t", "-c", "user.email=t@t"}, args...)
	if out, err := exec.Command("git", args...).CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func TestParsePorcelainV2(t *testing.T) {
	out := `# branch.oid abc
# branch.head main
# branch.upstream origin/main
# branch.ab +2 -3
1 .M N... 100644 100644 100644 a b modified.go
1 A. N... 000000 100644 100644 a b added.go
1 .D N... 100644 100644 000000 a b deleted.go
2 R. N... 100644 100644 100644 a b R100 new.go	old.go
u UU N... 100644 100644 100644 100644 a b c conflict.go
? untracked.go
? .DS_Store
? build/.DS_Store`
	var st GitStatus
	parsePorcelainV2(out, &st)
	want := GitStatus{Branch: "main", Upstream: "origin/main", Ahead: 2, Behind: 3,
		Added: 1, Modified: 2, Deleted: 1, Untracked: 1, Conflicts: 1}
	if st != want {
		t.Fatalf("got %+v\nwant %+v", st, want)
	}
}

func TestReadStatus(t *testing.T) {
	ctx := context.Background()
	remote := initRepo(t)
	clone := filepath.Join(t.TempDir(), "clone")
	if out, err := exec.Command("git", "clone", "-q", remote, clone).CombinedOutput(); err != nil {
		t.Fatalf("clone: %v\n%s", err, out)
	}

	git(t, clone, "commit", "-q", "--allow-empty", "-m", "local")
	git(t, remote, "commit", "-q", "--allow-empty", "-m", "remote")
	git(t, clone, "fetch", "-q")
	if err := os.WriteFile(filepath.Join(clone, "new.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	st := readStatus(ctx, Project{ID: 7, Path: clone})
	if st.Error != "" {
		t.Fatal(st.Error)
	}
	if st.ProjectID != 7 || st.Branch == "" || st.Upstream == "" {
		t.Fatalf("unexpected branch info: %+v", st)
	}
	if st.Ahead != 1 || st.Behind != 1 || st.Untracked != 1 || st.Changes() != 1 {
		t.Fatalf("unexpected counts: %+v", st)
	}
	if st.LastFetch == nil || st.LastCommit == nil {
		t.Fatalf("expected fetch and commit times: %+v", st)
	}

	git(t, clone, "checkout", "-q", "--detach")
	if st := readStatus(ctx, Project{Path: clone}); st.State != RepoStateDetached {
		t.Fatalf("want detached, got %q", st.State)
	}
}

func TestReadStatusMissingDirectory(t *testing.T) {
	st := readStatus(context.Background(), Project{Path: filepath.Join(t.TempDir(), "gone")})
	if st.State != RepoStateMissing {
		t.Fatalf("want missing, got %q", st.State)
	}
}
