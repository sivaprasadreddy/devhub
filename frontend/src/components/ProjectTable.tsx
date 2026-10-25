import { Browser } from '@wailsio/runtime'
import type { Project, RepoActivity } from '../../bindings/devhub/backend'
import { LocalStatus, SyncStatus } from './GitBadges'
import { ActivityState, attentionReasons, relativeTime, StatusMap } from '../status'

interface ProjectTableProps {
  projects: Project[]
  statuses: StatusMap
  activity: ActivityState | null
  onOpen: (id: number) => void
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

function ProjectTable({ projects, statuses, activity, onOpen }: ProjectTableProps) {
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
                  <button className="project-link" onClick={() => onOpen(p.id)} title="View project details">
                    {p.name}
                  </button>
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
