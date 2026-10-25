package backend

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"path"
	"strings"
)

// runGit runs git with args and returns trimmed stdout.
func runGit(ctx context.Context, dir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", args...)
	cmd.Dir = dir
	var stderr strings.Builder
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		if msg := strings.TrimSpace(stderr.String()); msg != "" {
			return "", errors.New(msg)
		}
		return "", fmt.Errorf("git %s: %w", args[0], err)
	}
	return strings.TrimSpace(string(out)), nil
}

// repoRoot returns the top-level directory of the repository containing dir.
func repoRoot(ctx context.Context, dir string) (string, error) {
	root, err := runGit(ctx, dir, "rev-parse", "--show-toplevel")
	if err != nil {
		return "", fmt.Errorf("%s is not a Git repository", dir)
	}
	return root, nil
}

// remoteURL returns the URL of the origin remote, or "" if there is none.
func remoteURL(ctx context.Context, dir string) string {
	url, err := runGit(ctx, dir, "remote", "get-url", "origin")
	if err != nil {
		return ""
	}
	return url
}

// gitClone clones url into dest.
func gitClone(ctx context.Context, url, dest string) error {
	_, err := runGit(ctx, "", "clone", "--", url, dest)
	return err
}

// repoNameFromURL derives a directory name from a clone URL, e.g.
// "git@github.com:org/repo.git" -> "repo".
func repoNameFromURL(url string) string {
	url = strings.TrimRight(strings.TrimSpace(url), "/")
	url = strings.TrimSuffix(url, ".git")
	if i := strings.LastIndexAny(url, ":/"); i >= 0 {
		url = url[i+1:]
	}
	return path.Base(url)
}
