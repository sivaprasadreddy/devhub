import { RepoState } from '../bindings/devhub/backend'
import type { GitStatus } from '../bindings/devhub/backend'

export type StatusMap = Map<number, GitStatus>

export function changeCount(s: GitStatus): number {
  return s.added + s.modified + s.deleted + s.untracked + s.conflicts
}

const stateLabels: Record<string, string> = {
  [RepoState.RepoStateMerging]: 'Merge in progress',
  [RepoState.RepoStateRebasing]: 'Rebase in progress',
  [RepoState.RepoStateCherryPick]: 'Cherry-pick in progress',
  [RepoState.RepoStateReverting]: 'Revert in progress',
  [RepoState.RepoStateBisecting]: 'Bisect in progress',
  [RepoState.RepoStateDetached]: 'Detached HEAD',
  [RepoState.RepoStateMissing]: 'Directory missing',
  [RepoState.RepoStateStatusError]: 'Status error',
}

export function stateLabel(s: GitStatus): string {
  return stateLabels[s.state] ?? ''
}

// attentionReasons explains why a project needs attention; empty means it is in sync.
export function attentionReasons(s: GitStatus | undefined): string[] {
  if (!s) {
    return []
  }
  const reasons: string[] = []
  const label = stateLabel(s)
  if (label) reasons.push(label)
  if (s.conflicts > 0) reasons.push(`${s.conflicts} conflicted`)
  if (changeCount(s) > 0) reasons.push('Uncommitted changes')
  if (s.ahead > 0) reasons.push(`${s.ahead} unpushed`)
  if (s.behind > 0) reasons.push(`${s.behind} incoming`)
  if (!s.upstream && s.branch && s.state === RepoState.RepoStateClean) reasons.push('No upstream')
  return reasons
}

export function lastActivity(s: GitStatus | undefined): number {
  return s?.lastCommit ? new Date(s.lastCommit).getTime() : 0
}

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function relativeTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never'
  }
  const seconds = (new Date(value).getTime() - Date.now()) / 1000
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.round(seconds / size), unit)
    }
  }
  return 'just now'
}
