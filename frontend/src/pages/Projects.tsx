import type { Project } from '../../bindings/devhub/backend'
import EmptyState from '../components/EmptyState'

interface ProjectsProps {
  projects: Project[]
}

function Projects({ projects }: ProjectsProps) {
  return (
    <div className="page">
      <div className="page-actions">
        <button className="btn btn-primary" disabled>Add local repository</button>
        <button className="btn" disabled>Clone repository</button>
      </div>

      <section className="panel">
        {projects.length === 0 ? (
          <EmptyState title="No projects" description="Projects you add will be listed here, grouped by workspace." />
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id} className="project-card">
                <div>
                  <div className="project-name">{p.name}</div>
                  <div className="muted small">{p.path}</div>
                  {p.remoteUrl && <div className="muted small">{p.remoteUrl}</div>}
                </div>
                <div className="project-card-actions">
                  <button className="btn" disabled>Terminal</button>
                  <button className="btn" disabled>IDE</button>
                  <button className="btn" disabled>Finder</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Projects
