import { useState } from 'react'
import { Dialogs } from '@wailsio/runtime'
import { LauncherService, ProjectService } from '../../bindings/devhub/backend'
import type { Project } from '../../bindings/devhub/backend'
import CloneForm from '../components/CloneForm'
import EmptyState from '../components/EmptyState'
import { errorMessage } from '../errors'
import { appName, useLaunchers } from '../launchers'

interface ProjectsProps {
  projects: Project[]
  onChange: () => void
}

function Projects({ projects, onChange }: ProjectsProps) {
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState('')
  const [launchers] = useLaunchers()

  const run = (action: Promise<void>) => {
    setError('')
    action.catch((e) => setError(errorMessage(e)))
  }

  const ides = launchers?.ides ?? []
  const preferredIDE = launchers?.preferences.ide ?? ''
  const preferredIDEName = appName(ides, preferredIDE)
  const terminalName = appName(launchers?.terminals ?? [], launchers?.preferences.terminal ?? '')

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
                  <div className="project-name">{p.name}</div>
                  <div className="muted small">{p.path}</div>
                  {p.remoteUrl && <div className="muted small">{p.remoteUrl}</div>}
                </div>
                <div className="project-card-actions">
                  <button
                    className="btn"
                    title={terminalName ? `Open in ${terminalName}` : 'Open in terminal'}
                    onClick={() => run(LauncherService.OpenInTerminal(p.path))}
                  >
                    Terminal
                  </button>
                  <div className="ide-group">
                    <button
                      className="btn btn-icon"
                      title={preferredIDEName ? `Open in ${preferredIDEName}` : 'No IDE found'}
                      disabled={!preferredIDE}
                      onClick={() => run(LauncherService.OpenInApp(preferredIDE, p.path))}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    </button>
                    <select
                      className="ide-select"
                      aria-label="Open in IDE"
                      value=""
                      disabled={ides.length === 0}
                      onChange={(e) => e.target.value && run(LauncherService.OpenInApp(e.target.value, p.path))}
                    >
                      <option value="">Open in…</option>
                      {ides.map((a) => (
                        <option key={a.path} value={a.path}>
                          {a.name}{a.path === preferredIDE ? ' (preferred)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn" title="Show in Finder" onClick={() => run(LauncherService.OpenInFinder(p.path))}>
                    Finder
                  </button>
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
