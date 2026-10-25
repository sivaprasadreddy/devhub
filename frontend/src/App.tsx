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

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const refresh = useCallback(() => {
    ProjectService.ListProjects()
      .then((list) => {
        setProjects(list ?? [])
        setLastRefresh(new Date())
      })
      .catch(console.error)
  }, [])

  useEffect(refresh, [refresh])

  const title = [...mainNav, ...footerNav].find((item) => item.id === page)?.label ?? ''
  const query = search.trim().toLowerCase()
  const visibleProjects = query
    ? projects.filter((p) => p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query))
    : projects

  return (
    <div className="app">
      <Sidebar active={page} onSelect={setPage} projectCount={projects.length} />
      <div className="main">
        <Topbar title={title} search={search} onSearch={setSearch} onRefresh={refresh} lastRefresh={lastRefresh} />
        <main className="content">
          {page === 'dashboard' && <Dashboard projects={visibleProjects} onAddProject={() => setPage('projects')} />}
          {page === 'projects' && <Projects projects={visibleProjects} />}
          {page === 'activity' && <Activity />}
          {page === 'insights' && <Insights />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}

export default App
