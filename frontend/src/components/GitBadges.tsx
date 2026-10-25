import type { GitStatus } from '../../bindings/devhub/backend'
import { stateLabel } from '../status'

export function LocalStatus({ status }: { status: GitStatus }) {
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

export function SyncStatus({ status }: { status: GitStatus }) {
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
