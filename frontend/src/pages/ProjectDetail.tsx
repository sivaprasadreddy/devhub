import { useCallback, useEffect, useState } from 'react'
import { Browser } from '@wailsio/runtime'
import { ActivityService } from '../../bindings/devhub/backend'
import type { Issue, Label, ProjectDetails, PullRequest } from '../../bindings/devhub/backend'
import EmptyState from '../components/EmptyState'
import { LocalStatus, SyncStatus } from '../components/GitBadges'
import ProjectActions from '../components/ProjectActions'
import { errorMessage } from '../errors'
import { relativeTime } from '../status'

interface ProjectDetailProps {
  projectId: number
  // Changes whenever the app refreshes, triggering a reload.
  refreshCount: number
  onBack: () => void
}

type Tab = 'prs' | 'issues'
type PRFilter = 'all' | 'review' | 'mine' | 'drafts'
type IssueFilter = 'all' | 'assigned'

// Items with no activity for this long are flagged as stale.
const staleDays = 30

function isStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > staleDays * 24 * 3600 * 1000
}

const prFilters: { id: PRFilter; label: string; test: (pr: PullRequest) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'review', label: 'Review requested', test: (pr) => pr.reviewRequested },
  { id: 'mine', label: 'Mine & assigned', test: (pr) => pr.mine || pr.assignedToMe },
  { id: 'drafts', label: 'Drafts', test: (pr) => pr.draft },
]

const issueFilters: { id: IssueFilter; label: string; test: (issue: Issue) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'assigned', label: 'Assigned to me', test: (issue) => issue.assignedToMe },
]

const ciBadges: Record<string, { text: string; tone: string }> = {
  SUCCESS: { text: 'CI passing', tone: 'success' },
  FAILURE: { text: 'CI failing', tone: 'danger' },
  ERROR: { text: 'CI error', tone: 'danger' },
  PENDING: { text: 'CI running', tone: 'warning' },
  EXPECTED: { text: 'CI pending', tone: 'warning' },
}

const reviewBadges: Record<string, { text: string; tone: string }> = {
  APPROVED: { text: 'Approved', tone: 'success' },
  CHANGES_REQUESTED: { text: 'Changes requested', tone: 'danger' },
  REVIEW_REQUIRED: { text: 'Review required', tone: 'muted' },
}

function open(url: string) {
  Browser.OpenURL(url).catch(console.error)
}

function Labels({ labels }: { labels: Label[] | null }) {
  return (
    <>
      {(labels ?? []).map((l) => (
        <span key={l.name} className="label" style={{ ['--label-color' as string]: `#${l.color}` }}>{l.name}</span>
      ))}
    </>
  )
}

function ItemRow({ url, number, title, meta, badges, labels, comments, stale }: {
  url: string
  number: number
  title: string
  meta: string
  badges: { text: string; tone: string }[]
  labels: Label[] | null
  comments: number
  stale: boolean
}) {
  return (
    <li className="item-row">
      <div className="item-main">
        <button className="item-title" onClick={() => open(url)} title="Open on GitHub">{title}</button>
        <div className="item-meta muted small">#{number} · {meta}</div>
        <div className="badges">
          {badges.map((b) => <span key={b.text} className={`badge badge-${b.tone}`}>{b.text}</span>)}
          {stale && <span className="badge badge-muted" title={`No activity for over ${staleDays} days`}>Stale</span>}
          <Labels labels={labels} />
        </div>
      </div>
      {comments > 0 && <span className="muted small" title="Comments">💬 {comments}</span>}
    </li>
  )
}

function prBadges(pr: PullRequest) {
  const badges: { text: string; tone: string }[] = []
  if (pr.draft) badges.push({ text: 'Draft', tone: 'muted' })
  if (pr.reviewRequested) badges.push({ text: 'Your review requested', tone: 'warning' })
  if (pr.assignedToMe) badges.push({ text: 'Assigned to you', tone: 'warning' })
  if (reviewBadges[pr.reviewDecision]) badges.push(reviewBadges[pr.reviewDecision])
  if (ciBadges[pr.ciState]) badges.push(ciBadges[pr.ciState])
  return badges
}

function ProjectDetail({ projectId, refreshCount, onBack }: ProjectDetailProps) {
  const [details, setDetails] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState<Tab>('prs')
  const [prFilter, setPRFilter] = useState<PRFilter>('all')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    ActivityService.GetProjectDetails(projectId)
      .then(setDetails)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(load, [load, refreshCount])

  if (!details) {
    return (
      <div className="page">
        <button className="back-link" onClick={onBack}>← Projects</button>
        {error ? <p className="error">{error}</p> : <EmptyState title="Loading…" description="Reading project details." />}
      </div>
    )
  }

  const { project, status, remote } = details
  const prs = (remote?.pullRequests ?? []).filter(prFilters.find((f) => f.id === prFilter)!.test)
  const issues = (remote?.issues ?? []).filter(issueFilters.find((f) => f.id === issueFilter)!.test)

  const remoteBody = () => {
    if (!details.connected) {
      return <EmptyState title="GitHub is not connected" description="Sign in with gh auth login or set GITHUB_TOKEN, then reload." />
    }
    if (details.remoteError) {
      return <EmptyState title="Could not load GitHub data" description={details.remoteError} />
    }
    if (!remote) {
      return (
        <EmptyState
          title={project.remoteUrl ? 'Not a GitHub repository' : 'No remote configured'}
          description="Pull requests and issues are available for repositories hosted on GitHub."
        />
      )
    }

    const total = tab === 'prs' ? remote.openPrs : remote.openIssues
    const loaded = tab === 'prs' ? remote.pullRequests?.length ?? 0 : remote.issues?.length ?? 0
    const allURL = `${remote.webUrl}/${tab === 'prs' ? 'pulls' : 'issues'}`

    return (
      <>
        <div className="panel-toolbar">
          <div className="chips">
            {tab === 'prs'
              ? prFilters.map((f) => (
                <button key={f.id} className={`chip${prFilter === f.id ? ' is-active' : ''}`} onClick={() => setPRFilter(f.id)}>
                  {f.label}{f.id !== 'all' && ` · ${(remote.pullRequests ?? []).filter(f.test).length}`}
                </button>
              ))
              : issueFilters.map((f) => (
                <button key={f.id} className={`chip${issueFilter === f.id ? ' is-active' : ''}`} onClick={() => setIssueFilter(f.id)}>
                  {f.label}{f.id !== 'all' && ` · ${(remote.issues ?? []).filter(f.test).length}`}
                </button>
              ))}
          </div>
        </div>

        {tab === 'prs' && (prs.length === 0 ? (
          <EmptyState title="No pull requests" description="No open pull requests match this filter." />
        ) : (
          <ul className="item-list">
            {prs.map((pr) => (
              <ItemRow
                key={pr.number}
                url={pr.url}
                number={pr.number}
                title={pr.title}
                meta={`${pr.author} wants to merge ${pr.branch} · updated ${relativeTime(pr.updatedAt)}`}
                badges={prBadges(pr)}
                labels={pr.labels}
                comments={pr.comments}
                stale={isStale(pr.updatedAt)}
              />
            ))}
          </ul>
        ))}

        {tab === 'issues' && (issues.length === 0 ? (
          <EmptyState title="No issues" description="No open issues match this filter." />
        ) : (
          <ul className="item-list">
            {issues.map((issue) => (
              <ItemRow
                key={issue.number}
                url={issue.url}
                number={issue.number}
                title={issue.title}
                meta={`opened by ${issue.author} ${relativeTime(issue.createdAt)} · updated ${relativeTime(issue.updatedAt)}${
                  issue.assignees?.length ? ` · assigned to ${issue.assignees.join(', ')}` : ''}`}
                badges={issue.assignedToMe ? [{ text: 'Assigned to you', tone: 'warning' }] : []}
                labels={issue.labels}
                comments={issue.comments}
                stale={isStale(issue.updatedAt)}
              />
            ))}
          </ul>
        ))}

        <div className="panel-footer muted small">
          {loaded < total ? `Showing the ${loaded} most recently updated of ${total} open. ` : `${total} open. `}
          <button className="link" onClick={() => open(allURL)}>View all on GitHub</button>
        </div>
      </>
    )
  }

  return (
    <div className="page">
      <div className="detail-header">
        <div className="detail-title">
          <button className="back-link" onClick={onBack}>← Projects</button>
          <h2>{project.name}</h2>
          <div className="muted small">{project.path}</div>
          {project.remoteUrl && (
            remote
              ? <button className="link small" onClick={() => open(remote.webUrl)}>{remote.repo}</button>
              : <div className="muted small">{project.remoteUrl}</div>
          )}
        </div>
        <div className="project-card-actions">
          <ProjectActions project={project} onError={setActionError} />
          <button className="btn" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        </div>
      </div>
      {actionError && <p className="error">{actionError}</p>}
      {error && <p className="error">{error}</p>}

      <section className="detail-grid">
        <div className="detail-card">
          <span className="muted small">Branch</span>
          <span className="detail-value">{status.branch || '—'}</span>
          <span className="muted small">{status.upstream || 'No upstream'}</span>
        </div>
        <div className="detail-card">
          <span className="muted small">Local status</span>
          <LocalStatus status={status} />
        </div>
        <div className="detail-card">
          <span className="muted small">Remote sync</span>
          <SyncStatus status={status} />
        </div>
        <div className="detail-card">
          <span className="muted small">Last fetch</span>
          <span className="detail-value">{relativeTime(status.lastFetch)}</span>
        </div>
        <div className="detail-card">
          <span className="muted small">Last commit</span>
          <span className="detail-value">{status.lastCommit ? relativeTime(status.lastCommit) : '—'}</span>
        </div>
      </section>

      <section className="panel">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'prs'} className={`tab${tab === 'prs' ? ' is-active' : ''}`} onClick={() => setTab('prs')}>
            Pull requests{remote && <span className="tab-count">{remote.openPrs}</span>}
          </button>
          <button role="tab" aria-selected={tab === 'issues'} className={`tab${tab === 'issues' ? ' is-active' : ''}`} onClick={() => setTab('issues')}>
            Issues{remote && <span className="tab-count">{remote.openIssues}</span>}
          </button>
        </div>
        {remoteBody()}
      </section>
    </div>
  )
}

export default ProjectDetail
