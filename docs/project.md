# DevHub
DevHub is a desktop application for managing multiple software projects from one place. 
It provides a unified view of local Git repository state, remote collaboration activity, and project health.

## 1. Multi-Project Management

Add and organize software projects in one desktop application.

- Add an existing local Git repository by selecting its directory.
- Clone a remote repository from GitHub or another Git hosting provider.
- Group projects by workspace, organization, or technology.
- Display repository name, local path, remote URL, and last activity.
- Open a project in the terminal, IDE, or file manager.

**Goal:** Provide one place to access every project.

## 2. Git Repository Health

Show the local Git state of every project at a glance, including whether it is synchronized with its remote.

- Detect uncommitted changes: modified, added, deleted, and untracked files.
- Detect unpushed commits: local commits not yet on the remote.
- Detect incoming commits: remote commits not yet pulled locally.
- Display the current branch and upstream tracking status.
- Identify merge conflicts, detached HEAD, and other important repository states.
- Display the last fetch time and repository synchronization status.

**Goal:** Make it easy to identify which projects need attention.

## 3. Pull Requests and Issues Dashboard

Aggregate Git hosting activity across configured projects.

- Show open pull requests, drafts, review requests, and PRs awaiting the user's review.
- Show CI checks and review/merge status where available.
- Show open and closed issues, including labels and assignees.
- Highlight PRs and issues assigned to the user.
- Identify stale PRs and issues with no recent activity.
- Provide direct links to open each item in the browser.

**Goal:** Understand project activity without visiting each repository's website.

## 4. Project Insights and Activity

Provide a quick overview of repository health and development activity.

- Display contributors and recent contributions.
- Show recent commits and active branches.
- Summarize commit activity over a selected period.
- Show the latest workflow runs and failed CI builds.
- Display releases, tags, and the latest release version.
- Summarize pending work and recent changes for each project.

**Goal:** Quickly understand the state and momentum of each project.

## 5. Unified Dashboard and Quick Actions

Bring project information together in one actionable overview.

- Show all projects and their health indicators on a single dashboard.
- Filter projects with uncommitted changes, unpushed commits, failing CI, or open PRs.
- Search and sort projects by name, activity, or status.
- Provide quick actions to fetch, pull, open a terminal, or open a project in an IDE.
- Support configurable refresh intervals and manual refresh.
- Use visual indicators or notifications for important changes.

**Goal:** Spend less time checking projects and more time working on them.

## Suggested Dashboard Summary

The dashboard can include summary counts such as:

- Total projects
- Projects with uncommitted changes
- Projects with unpushed commits
- Open pull requests
- Projects with failing CI

Each project row or card can show:

- Project and repository name
- Current branch
- Local Git status
- Ahead/behind status relative to the remote
- Open PR and issue counts
- CI status
- Last refresh time

*Any dashboard counts shown in mockups should be treated as illustrative until connected to real repositories.*

## Recommended MVP Roadmap

### Phase 1: Foundation

- Add local repositories.
- Clone remote repositories.
- Persist the project list and basic project metadata.

### Phase 2: Git Status

- Detect working-tree changes.
- Detect commits ahead of or behind the remote-tracking branch.
- Display branch, upstream, and synchronization status.

### Phase 3: GitHub Integration

- Add GitHub authentication.
- Show pull requests, issues, contributors, and CI status.

### Phase 4: Unified Dashboard

- Add cross-project summaries.
- Add search, filtering, sorting, and quick actions.

### Phase 5: Insights

- Add activity history.
- Detect stale PRs.
- Add notifications and release information.

## Implementation Notes

- **Keep local Git status independent of GitHub.** Use local Git operations to inspect working-tree changes and compare local commits with fetched remote-tracking references.
- **Make network refresh explicit.** Fetching updates remote-tracking references; the UI should display when the last fetch occurred.
- **Start with GitHub.** Keep remote-provider integrations behind a small interface so GitLab or Bitbucket can be added later without complicating the MVP.
- **Use the existing Git CLI initially.** In the Wails application, Go can handle Git operations, filesystem access, and background refreshes, while the frontend presents the dashboard. Avoid implementing a full Git client in the first version.

## Product Principle

> Open DevHub and immediately know which projects need attention, why they need attention, and what action to take.
