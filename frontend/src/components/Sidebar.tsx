import { NavItem, PageId, footerNav, mainNav } from '../navigation'

interface SidebarProps {
  active: PageId
  onSelect: (page: PageId) => void
  projectCount: number
}

function Sidebar({ active, onSelect, projectCount }: SidebarProps) {
  const renderItem = (item: NavItem) => (
    <button
      key={item.id}
      className={`nav-item${active === item.id ? ' is-active' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="nav-label">{item.label}</span>
      {item.id === 'projects' && <span className="nav-badge">{projectCount}</span>}
    </button>
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-titlebar" />
      <div className="sidebar-brand">DevHub</div>
      <nav className="nav">{mainNav.map(renderItem)}</nav>
      <nav className="nav nav-footer">{footerNav.map(renderItem)}</nav>
    </aside>
  )
}

export default Sidebar
