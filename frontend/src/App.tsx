import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityService, ProjectService, SettingsService } from '../bindings/devhub/backend'
import type { Project } from '../bindings/devhub/backend'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Activity from './pages/Activity'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import ProjectDetail from './pages/ProjectDetail'
import { PageId, footerNav, mainNav } from './navigation'
import { ActivityState, StatusMap } from './status'

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  // When set, the Projects page shows this project's details.
  const [openProjectId, setOpenProjectId] = useState<number | null>(null)

  const navigate = (next: PageId) => {
    setPage(next)
    setOpenProjectId(null)
  }

  const openProject = (id: number) => {
    setPage('projects')
    setOpenProjectId(id)
  }
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [statuses, setStatuses] = useState<StatusMap>(new Map())
  const [refreshing, setRefreshing] = useState(false)
  const [activity, setActivity] = useState<ActivityState | null>(null)
  // Auto-refresh interval in seconds; 0 = manual only, null = not loaded yet.
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)
  // Incremented after every refresh so open detail views reload too.
  const [refreshCount, setRefreshCount] = useState(0)
  const refreshingRef = useRef(false)
  const lastRefreshRef = useRef(0)

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
    // Skip if a refresh is still running, e.g. a timer tick during a slow manual refresh.
    if (refreshingRef.current) return
    refreshingRef.current = true
    setRefreshing(true)
    loadActivity()
    try {
      const [list, statusList] = await Promise.all([ProjectService.ListProjects(), ProjectService.GetStatuses()])
      setProjects(list ?? [])
      setStatuses(new Map((statusList ?? []).map((st) => [st.projectId, st])))
      setLastRefresh(new Date())
      setRefreshCount((n) => n + 1)
    } catch (e) {
      console.error(e)
    } finally {
      lastRefreshRef.current = Date.now()
      refreshingRef.current = false
      setRefreshing(false)
    }
  }, [loadActivity])

  useEffect(() => {
    refresh()
    SettingsService.GetRefreshInterval().then(setRefreshInterval).catch(console.error)
  }, [refresh])

  // Auto-refresh on the configured interval. Ticks are skipped while the window
  // is hidden; when it becomes visible again an overdue refresh runs at once.
  useEffect(() => {
    if (!refreshInterval) return
    const intervalMs = refreshInterval * 1000
    const refreshIfDue = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefreshRef.current >= intervalMs) {
        refresh()
      }
    }
    // Tick more often than the interval so the schedule tracks manual refreshes.
    const timer = window.setInterval(refreshIfDue, Math.min(intervalMs, 30_000))
    document.addEventListener('visibilitychange', refreshIfDue)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshIfDue)
    }
  }, [refreshInterval, refresh])

  const changeRefreshInterval = async (seconds: number) => {
    await SettingsService.SetRefreshInterval(seconds)
    setRefreshInterval(seconds)
  }

  const title = [...mainNav, ...footerNav].find((item) => item.id === page)?.label ?? ''
  const query = search.trim().toLowerCase()
  const visibleProjects = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query))
    : projects

  return (
    <div className="app">
      <Sidebar active={page} onSelect={navigate} projectCount={projects.length} />
      <div className="main">
        <Topbar title={title} search={search} onSearch={setSearch} onRefresh={refresh} refreshing={refreshing} lastRefresh={lastRefresh} refreshInterval={refreshInterval} />
        <main className="content">
          {page === 'dashboard' && <Dashboard projects={visibleProjects} statuses={statuses} activity={activity} onAddProject={() => navigate('projects')} onOpenProject={openProject} />}
          {page === 'projects' && openProjectId === null && (
            <Projects projects={visibleProjects} onChange={refresh} onOpen={openProject} />
          )}
          {page === 'projects' && openProjectId !== null && (
            <ProjectDetail key={openProjectId} projectId={openProjectId} refreshCount={refreshCount} onBack={() => setOpenProjectId(null)} />
          )}
          {page === 'activity' && <Activity />}
          {page === 'insights' && <Insights />}
          {page === 'settings' && <Settings activity={activity} refreshInterval={refreshInterval} onRefreshIntervalChange={changeRefreshInterval} />}
        </main>
      </div>
    </div>
  )
}

export default App
