import { LauncherService } from '../../bindings/devhub/backend'
import type { Project } from '../../bindings/devhub/backend'
import { errorMessage } from '../errors'
import { useLaunchers } from '../launchers'
import AppIcon from './AppIcon'
import AppMenu from './AppMenu'

interface ProjectActionsProps {
  project: Project
  onError: (message: string) => void
}

// ProjectActions opens a project in the preferred terminal, an IDE, or Finder.
function ProjectActions({ project, onError }: ProjectActionsProps) {
  const [launchers] = useLaunchers()

  const run = (action: Promise<void>) => {
    onError('')
    action.catch((e) => onError(errorMessage(e)))
  }

  const ides = launchers?.ides ?? []
  const preferredIDE = launchers?.preferences.ide ?? ''
  const preferredApp = ides.find((a) => a.path === preferredIDE)
  const terminalApp = launchers?.terminals.find((a) => a.path === launchers.preferences.terminal)

  return (
    <>
      <button
        className="btn btn-with-icon"
        title={terminalApp ? `Open in ${terminalApp.name}` : 'Open in terminal'}
        onClick={() => run(LauncherService.OpenInTerminal(project.path))}
      >
        {terminalApp && <AppIcon app={terminalApp} />}
        Terminal
      </button>
      <div className="ide-group">
        <button
          className="btn btn-icon"
          title={preferredApp ? `Open in ${preferredApp.name}` : 'No IDE found'}
          disabled={!preferredApp}
          onClick={() => run(LauncherService.OpenInApp(preferredIDE, project.path))}
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
          onSelect={(path) => run(LauncherService.OpenInApp(path, project.path))}
        />
      </div>
      <button className="btn" title="Show in Finder" onClick={() => run(LauncherService.OpenInFinder(project.path))}>
        Finder
      </button>
    </>
  )
}

export default ProjectActions
