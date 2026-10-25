import type { Project } from '../../bindings/devhub/backend'

interface ProjectTableProps {
  projects: Project[]
}

const columns = ['Project', 'Branch', 'Local status', 'Ahead / Behind', 'PRs', 'Issues', 'CI', 'Last refresh']

function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <table className="table">
      <thead>
        <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {projects.map((p) => (
          <tr key={p.id}>
            <td>
              <div className="project-name">{p.name}</div>
              <div className="muted small">{p.path}</div>
            </td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default ProjectTable
