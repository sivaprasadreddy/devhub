interface TopbarProps {
  title: string
  search: string
  onSearch: (value: string) => void
  onRefresh: () => void
  lastRefresh: Date | null
}

function Topbar({ title, search, onSearch, onRefresh, lastRefresh }: TopbarProps) {
  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <input
          className="search"
          type="search"
          placeholder="Search projects"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="muted">
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Not refreshed yet'}
        </span>
        <button className="btn" onClick={onRefresh}>Refresh</button>
      </div>
    </header>
  )
}

export default Topbar
