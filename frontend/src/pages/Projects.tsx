import { useState } from 'react'
import { Dialogs } from '@wailsio/runtime'
import { LauncherService, ProjectService } from '../../bindings/devhub/backend'
import type { Project } from '../../bindings/devhub/backend'
import CloneForm from '../components/CloneForm'
import EmptyState from '../components/EmptyState'
import { errorMessage } from '../errors'
import { useLaunchers } from '../launchers'
import AppIcon from '../components/AppIcon'
import AppMenu from '../components/AppMenu'

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
  const preferredApp = ides.find((a) => a.path === preferredIDE)
  const terminalApp = launchers?.terminals.find((a) => a.path === launchers.preferences.terminal)

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
                    className="btn btn-with-icon"
                    title={terminalApp ? `Open in ${terminalApp.name}` : 'Open in terminal'}
                    onClick={() => run(LauncherService.OpenInTerminal(p.path))}
                  >
                    {terminalApp && <AppIcon app={terminalApp} />}
                    Terminal
                  </button>
                  <div className="ide-group">
                    <button
                      className="btn btn-icon"
                      title={preferredApp ? `Open in ${preferredApp.name}` : 'No IDE found'}
                      disabled={!preferredApp}
                      onClick={() => run(LauncherService.OpenInApp(preferredIDE, p.path))}
                    >
                      <AppIcon app={preferredApp} />
                    </button>
                    <AppMenu
                      apps={ides}
                      className="ide-menu-trigger"
                      trigger="Open in…"
                      title="Open in another IDE"
                      marked={preferredIDE}
                      markLabel="Preferred"
                      onSelect={(path) => run(LauncherService.OpenInApp(path, p.path))}
                    />
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
