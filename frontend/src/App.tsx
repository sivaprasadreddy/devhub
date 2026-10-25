import { useCallback, useEffect, useState } from 'react'
import { ActivityService, ProjectService } from '../bindings/devhub/backend'
import type { Project } from '../bindings/devhub/backend'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Activity from './pages/Activity'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import { PageId, footerNav, mainNav } from './navigation'
import { ActivityState, StatusMap } from './status'

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [statuses, setStatuses] = useState<StatusMap>(new Map())
  const [refreshing, setRefreshing] = useState(false)
  const [activity, setActivity] = useState<ActivityState | null>(null)

  // Remote activity loads separately so slow network calls never delay local Git status.
  const loadActivity = useCallback(() => {
    ActivityService.GetActivity()
      .then((a) => setActivity({
        connected: a.connected,
        error: a.error,
        repos: new Map((a.repos ?? []).map((r) => [r.projectId, r])),
      }))
      .catch((e) => setActivity({ connected: false, error: String(e), repos: new Map() }))
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    loadActivity()
    try {
      const [list, statusList] = await Promise.all([ProjectService.ListProjects(), ProjectService.GetStatuses()])
      setProjects(list ?? [])
      setStatuses(new Map((statusList ?? []).map((st) => [st.projectId, st])))
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setRefreshing(false)
    }
  }, [loadActivity])

  useEffect(() => {
    refresh()
  }, [refresh])

  const title = [...mainNav, ...footerNav].find((item) => item.id === page)?.label ?? ''
  const query = search.trim().toLowerCase()
  const visibleProjects = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query))
    : projects

  return (
    <div className="app">
      <Sidebar active={page} onSelect={setPage} projectCount={projects.length} />
      <div className="main">
        <Topbar title={title} search={search} onSearch={setSearch} onRefresh={refresh} refreshing={refreshing} lastRefresh={lastRefresh} />
        <main className="content">
          {page === 'dashboard' && <Dashboard projects={visibleProjects} statuses={statuses} activity={activity} onAddProject={() => setPage('projects')} />}
          {page === 'projects' && <Projects projects={visibleProjects} onChange={refresh} />}
          {page === 'activity' && <Activity />}
          {page === 'insights' && <Insights />}
          {page === 'settings' && <Settings activity={activity} />}
        </main>
      </div>
    </div>
  )
}

export default App
