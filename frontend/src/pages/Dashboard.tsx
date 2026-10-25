import type { Project } from '../../bindings/devhub/backend'
import EmptyState from '../components/EmptyState'
import ProjectTable from '../components/ProjectTable'
import SummaryCard from '../components/SummaryCard'

interface DashboardProps {
  projects: Project[]
  onAddProject: () => void
}

const filters = ['All', 'Uncommitted changes', 'Unpushed commits', 'Failing CI', 'Open PRs']

function Dashboard({ projects, onAddProject }: DashboardProps) {
  return (
    <div className="page">
      <section className="summary-grid">
        <SummaryCard label="Total projects" value={projects.length} />
        <SummaryCard label="Uncommitted changes" value="—" tone="warning" />
        <SummaryCard label="Unpushed commits" value="—" tone="warning" />
        <SummaryCard label="Open pull requests" value="—" />
        <SummaryCard label="Failing CI" value="—" tone="danger" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Projects</h2>
          <div className="chips">
            {filters.map((f, i) => (
              <button key={f} className={`chip${i === 0 ? ' is-active' : ''}`}>{f}</button>
            ))}
          </div>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Add a local Git repository or clone one to see its health here."
            action={<button className="btn btn-primary" onClick={onAddProject}>Add project</button>}
          />
        ) : (
          <ProjectTable projects={projects} />
        )}
      </section>
    </div>
  )
}

export default Dashboard
