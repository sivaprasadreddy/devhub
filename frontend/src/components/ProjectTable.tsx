import { Browser } from '@wailsio/runtime'
import type { GitStatus, Project, RepoActivity } from '../../bindings/devhub/backend'
import { ActivityState, attentionReasons, relativeTime, stateLabel, StatusMap } from '../status'

interface ProjectTableProps {
  projects: Project[]
  statuses: StatusMap
  activity: ActivityState | null
}

const columns = ['Project', 'Branch', 'Local status', 'Ahead / Behind', 'Last fetch', 'Last commit', 'PRs', 'Issues', 'CI']
const notConnected = 'Connect GitHub to see this'

function RemoteCount({ repo, count, path, label }: { repo: RepoActivity; count: number; path: string; label: string }) {
  if (repo.error) {
    return <span className="muted" title={repo.error}>!</span>
  }
  return (
    <button
      className={`link-count${count ? '' : ' muted'}`}
      title={`Open ${label} for ${repo.repo}`}
      onClick={() => Browser.OpenURL(`${repo.webUrl}/${path}`)}
    >
      {count}
    </button>
  )
}

function remoteCells(activity: ActivityState | null, project: Project) {
  const repo = activity?.repos.get(project.id)
  if (repo) {
    return (
      <>
        <td><RemoteCount repo={repo} count={repo.openPrs} path="pulls" label="pull requests" /></td>
        <td><RemoteCount repo={repo} count={repo.openIssues} path="issues" label="issues" /></td>
      </>
    )
  }
  const title = !activity
    ? 'Loading…'
    : !activity.connected
      ? notConnected
      : project.remoteUrl ? 'Not a GitHub repository' : 'No remote configured'
  return (
    <>
      <td className="muted" title={title}>—</td>
      <td className="muted" title={title}>—</td>
    </>
  )
}

function LocalStatus({ status }: { status: GitStatus }) {
  const label = stateLabel(status)
  const badges: { text: string; tone: string }[] = []
  if (label) badges.push({ text: label, tone: 'danger' })
  if (status.conflicts) badges.push({ text: `${status.conflicts} conflicted`, tone: 'danger' })
  if (status.modified) badges.push({ text: `${status.modified} modified`, tone: 'warning' })
  if (status.added) badges.push({ text: `${status.added} added`, tone: 'warning' })
  if (status.deleted) badges.push({ text: `${status.deleted} deleted`, tone: 'warning' })
  if (status.untracked) badges.push({ text: `${status.untracked} untracked`, tone: 'muted' })
  if (badges.length === 0) badges.push({ text: 'Clean', tone: 'success' })

  return (
    <div className="badges" title={status.error || undefined}>
      {badges.map((b) => <span key={b.text} className={`badge badge-${b.tone}`}>{b.text}</span>)}
    </div>
  )
}

function SyncStatus({ status }: { status: GitStatus }) {
  if (!status.upstream) {
    return <span className="muted">No upstream</span>
  }
  if (status.ahead === 0 && status.behind === 0) {
    return <span className="badge badge-success">In sync</span>
  }
  return (
    <span className="sync">
      <span className={status.ahead ? 'text-warning' : 'muted'} title="Unpushed commits">↑{status.ahead}</span>
      <span className={status.behind ? 'text-accent' : 'muted'} title="Incoming commits">↓{status.behind}</span>
    </span>
  )
}

function ProjectTable({ projects, statuses, activity }: ProjectTableProps) {
  return (
    <table className="table">
      <thead>
        <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {projects.map((p) => {
          const st = statuses.get(p.id)
          const needsAttention = attentionReasons(st).length > 0
          return (
            <tr key={p.id}>
              <td>
                <div className="project-name">
                  <span className={`dot ${needsAttention ? 'dot-warning' : 'dot-success'}`} />
                  {p.name}
                </div>
                <div className="muted small">{p.path}</div>
              </td>
              {st ? (
                <>
                  <td>
                    <div>{st.branch || <span className="muted">—</span>}</div>
                    {st.upstream && <div className="muted small">{st.upstream}</div>}
                  </td>
                  <td><LocalStatus status={st} /></td>
                  <td><SyncStatus status={st} /></td>
                  <td title={st.lastFetch ?? undefined}>{relativeTime(st.lastFetch)}</td>
                  <td title={st.lastCommit ?? undefined}>{st.lastCommit ? relativeTime(st.lastCommit) : '—'}</td>
                </>
              ) : (
                <td colSpan={5} className="muted">Loading…</td>
              )}
              {remoteCells(activity, p)}
              <td className="muted" title="CI status is not available yet">—</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ProjectTable
