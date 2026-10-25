import { useState } from 'react'
import { Dialogs } from '@wailsio/runtime'
import { ProjectService } from '../../bindings/devhub/backend'
import type { Project } from '../../bindings/devhub/backend'
import CloneForm from '../components/CloneForm'
import EmptyState from '../components/EmptyState'
import { errorMessage } from '../errors'
import ProjectActions from '../components/ProjectActions'

interface ProjectsProps {
  projects: Project[]
  onChange: () => void
  onOpen: (id: number) => void
}

function Projects({ projects, onChange, onOpen }: ProjectsProps) {
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState('')

  const addLocal = async () => {
    setError('')
    try {
      const dir = await ProjectService.SelectDirectory('Choose a local Git repository')
      if (!dir) {
        return
      }
      await ProjectService.AddLocalProject(dir)
      onChange()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const remove = async (p: Project) => {
    setError('')
    try {
      const answer = await Dialogs.Question({
        Title: `Remove ${p.name}?`,
        Message: 'The project is removed from DevHub. Files on disk are not deleted.',
        Buttons: [
          { Label: 'Cancel', IsCancel: true },
          { Label: 'Remove', IsDefault: true },
        ],
      })
      if (answer !== 'Remove') {
        return
      }
      await ProjectService.RemoveProject(p.id)
      onChange()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="page">
      <div className="page-actions">
        <button className="btn btn-primary" onClick={addLocal}>Add local repository</button>
        <button className="btn" onClick={() => setCloning(true)} disabled={cloning}>Clone repository</button>
      </div>
      {error && <p className="error">{error}</p>}

      {cloning && (
        <CloneForm
          onCloned={() => {
            setCloning(false)
            onChange()
          }}
          onCancel={() => setCloning(false)}
        />
      )}

      <section className="panel">
        {projects.length === 0 ? (
          <EmptyState title="No projects" description="Add a local Git repository or clone one to get started." />
        ) : (
          <ul className="project-list">
            {projects.map((p) => (
              <li key={p.id} className="project-card">
                <div>
                  <button className="project-link" onClick={() => onOpen(p.id)} title="View project details">
                    {p.name}
                  </button>
                  <div className="muted small">{p.path}</div>
                  {p.remoteUrl && <div className="muted small">{p.remoteUrl}</div>}
                </div>
                <div className="project-card-actions">
                  <ProjectActions project={p} onError={setError} />
                  <button className="btn btn-danger" onClick={() => remove(p)}>Remove</button>
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
