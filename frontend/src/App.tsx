import { useCallback, useEffect, useState } from 'react'
import { ProjectService } from '../bindings/devhub/backend'
import type { Project } from '../bindings/devhub/backend'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Activity from './pages/Activity'
import Insights from './pages/Insights'
import Settings from './pages/Settings'
import { PageId, footerNav, mainNav } from './navigation'
import { StatusMap } from './status'

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const [statuses, setStatuses] = useState<StatusMap>(new Map())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
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
  }, [])

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
          {page === 'dashboard' && <Dashboard projects={visibleProjects} statuses={statuses} onAddProject={() => setPage('projects')} />}
          {page === 'projects' && <Projects projects={visibleProjects} onChange={refresh} />}
          {page === 'activity' && <Activity />}
          {page === 'insights' && <Insights />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default App
