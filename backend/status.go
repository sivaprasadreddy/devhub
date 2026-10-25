package backend

import (
	"bufio"
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// RepoState describes an in-progress operation or unusual HEAD state.
type RepoState string

const (
	RepoStateClean       RepoState = ""
	RepoStateMerging     RepoState = "merging"
	RepoStateRebasing    RepoState = "rebasing"
	RepoStateCherryPick  RepoState = "cherry-picking"
	RepoStateReverting   RepoState = "reverting"
	RepoStateBisecting   RepoState = "bisecting"
	RepoStateDetached    RepoState = "detached"
	RepoStateMissing     RepoState = "missing"
	RepoStateStatusError RepoState = "error"
)

// GitStatus is the local Git state of a project.
type GitStatus struct {
	ProjectID   int64      `json:"projectId"`
	Branch      string     `json:"branch"`
	Upstream    string     `json:"upstream"`
	Ahead       int        `json:"ahead"`
	Behind      int        `json:"behind"`
	Added       int        `json:"added"`
	Modified    int        `json:"modified"`
	Deleted     int        `json:"deleted"`
	Untracked   int        `json:"untracked"`
	Conflicts   int        `json:"conflicts"`
	State       RepoState  `json:"state"`
	LastFetch   *time.Time `json:"lastFetch"`
	LastCommit  *time.Time `json:"lastCommit"`
	Error       string     `json:"error"`
	RefreshedAt time.Time  `json:"refreshedAt"`
}

// Changes returns the total number of uncommitted changes.
func (s GitStatus) Changes() int {
	return s.Added + s.Modified + s.Deleted + s.Untracked + s.Conflicts
}

// maxConcurrentStatus limits how many git processes run at once.
const maxConcurrentStatus = 8

// readStatuses reads the Git status of every project concurrently.
func readStatuses(ctx context.Context, projects []Project) []GitStatus {
	statuses := make([]GitStatus, len(projects))
	sem := make(chan struct{}, maxConcurrentStatus)
	var wg sync.WaitGroup
	for i, p := range projects {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			statuses[i] = readStatus(ctx, p)
		}()
	}
	wg.Wait()
	return statuses
}

// readStatus inspects the working tree and refs of a single project. It only
// uses local data; remote-tracking refs are as fresh as the last fetch.
func readStatus(ctx context.Context, p Project) GitStatus {
	st := GitStatus{ProjectID: p.ID, RefreshedAt: time.Now()}

	if _, err := os.Stat(p.Path); err != nil {
		st.State = RepoStateMissing
		st.Error = "directory not found"
		return st
	}

	out, err := runGit(ctx, p.Path, "--no-optional-locks", "status", "--porcelain=v2", "--branch")
	if err != nil {
		st.State = RepoStateStatusError
		st.Error = err.Error()
		return st
	}
	parsePorcelainV2(out, &st)

	if gitDir, err := runGit(ctx, p.Path, "rev-parse", "--absolute-git-dir"); err == nil {
		if state := operationState(gitDir); state != RepoStateClean {
			st.State = state
		}
		if info, err := os.Stat(filepath.Join(gitDir, "FETCH_HEAD")); err == nil {
			t := info.ModTime()
			st.LastFetch = &t
		}
	}

	if ts, err := runGit(ctx, p.Path, "log", "-1", "--format=%ct"); err == nil {
		if sec, err := strconv.ParseInt(ts, 10, 64); err == nil {
			t := time.Unix(sec, 0)
			st.LastCommit = &t
		}
	}
	return st
}

// parsePorcelainV2 fills st from `git status --porcelain=v2 --branch` output.
func parsePorcelainV2(out string, st *GitStatus) {
	scanner := bufio.NewScanner(strings.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		switch {
		case strings.HasPrefix(line, "# branch.head "):
			head := strings.TrimPrefix(line, "# branch.head ")
			if head == "(detached)" {
				st.State = RepoStateDetached
			} else {
				st.Branch = head
			}
		case strings.HasPrefix(line, "# branch.upstream "):
			st.Upstream = strings.TrimPrefix(line, "# branch.upstream ")
		case strings.HasPrefix(line, "# branch.ab "):
			fields := strings.Fields(strings.TrimPrefix(line, "# branch.ab "))
			if len(fields) == 2 {
				st.Ahead, _ = strconv.Atoi(strings.TrimPrefix(fields[0], "+"))
				st.Behind, _ = strconv.Atoi(strings.TrimPrefix(fields[1], "-"))
			}
		case strings.HasPrefix(line, "1 "), strings.HasPrefix(line, "2 "):
			if len(line) < 4 {
				continue
			}
			x, y := line[2], line[3]
			switch {
			case x == 'A':
				st.Added++
			case x == 'D' || y == 'D':
				st.Deleted++
			default:
				st.Modified++
			}
		case strings.HasPrefix(line, "u "):
			st.Conflicts++
		case strings.HasPrefix(line, "? "):
			st.Untracked++
		}
	}
}

// operationState detects merges, rebases and similar in-progress operations.
func operationState(gitDir string) RepoState {
	exists := func(name string) bool {
		_, err := os.Stat(filepath.Join(gitDir, name))
		return err == nil
	}
	switch {
	case exists("rebase-merge"), exists("rebase-apply"):
		return RepoStateRebasing
	case exists("MERGE_HEAD"):
		return RepoStateMerging
	case exists("CHERRY_PICK_HEAD"):
		return RepoStateCherryPick
	case exists("REVERT_HEAD"):
		return RepoStateReverting
	case exists("BISECT_LOG"):
		return RepoStateBisecting
	}
	return RepoStateClean
}
