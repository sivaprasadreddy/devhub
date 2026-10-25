import { useState } from 'react'
import type { GitStatus, Project } from '../../bindings/devhub/backend'
import EmptyState from '../components/EmptyState'
import ProjectTable from '../components/ProjectTable'
import SummaryCard from '../components/SummaryCard'
import { attentionReasons, changeCount, lastActivity, StatusMap } from '../status'

interface DashboardProps {
  projects: Project[]
  statuses: StatusMap
  onAddProject: () => void
}

type FilterId = 'all' | 'attention' | 'uncommitted' | 'unpushed' | 'incoming'
type SortId = 'status' | 'name' | 'activity'

const filters: { id: FilterId; label: string; test: (s: GitStatus | undefined) => boolean }[] = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'attention', label: 'Needs attention', test: (s) => attentionReasons(s).length > 0 },
  { id: 'uncommitted', label: 'Uncommitted changes', test: (s) => !!s && changeCount(s) > 0 },
  { id: 'unpushed', label: 'Unpushed commits', test: (s) => !!s && s.ahead > 0 },
  { id: 'incoming', label: 'Incoming commits', test: (s) => !!s && s.behind > 0 },
]

function Dashboard({ projects, statuses, onAddProject }: DashboardProps) {
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('status')

  const count = (id: FilterId) => {
    const test = filters.find((f) => f.id === id)!.test
    return projects.filter((p) => test(statuses.get(p.id))).length
  }

  const activeTest = filters.find((f) => f.id === filter)!.test
  const visible = projects
    .filter((p) => activeTest(statuses.get(p.id)))
    .sort((a, b) => {
      const sa = statuses.get(a.id)
      const sb = statuses.get(b.id)
      if (sort === 'activity') return lastActivity(sb) - lastActivity(sa)
      if (sort === 'status') {
        const diff = attentionReasons(sb).length - attentionReasons(sa).length
        if (diff !== 0) return diff
      }
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="page">
      <section className="summary-grid">
        <SummaryCard label="Total projects" value={projects.length} />
        <SummaryCard label="Need attention" value={count('attention')} tone="danger" />
        <SummaryCard label="Uncommitted changes" value={count('uncommitted')} tone="warning" />
        <SummaryCard label="Unpushed commits" value={count('unpushed')} tone="warning" />
        <SummaryCard label="Incoming commits" value={count('incoming')} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="chips">
            {filters.map((f) => (
              <button
                key={f.id}
                className={`chip${filter === f.id ? ' is-active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}{f.id !== 'all' && ` · ${count(f.id)}`}
              </button>
            ))}
          </div>
          <label className="sort">
            <span className="muted">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortId)}>
              <option value="status">Status</option>
              <option value="name">Name</option>
              <option value="activity">Last activity</option>
            </select>
          </label>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Add a local Git repository or clone one to see its health here."
            action={<button className="btn btn-primary" onClick={onAddProject}>Add project</button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing here" description="No projects match this filter." />
        ) : (
          <ProjectTable projects={visible} statuses={statuses} />
        )}
      </section>
    </div>
  )
}

export default Dashboard
