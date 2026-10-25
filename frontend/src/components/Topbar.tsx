interface TopbarProps {
  title: string
  search: string
  onSearch: (value: string) => void
  onRefresh: () => void
  refreshing: boolean
  lastRefresh: Date | null
  refreshInterval: number | null
}

export function formatInterval(seconds: number): string {
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} s`
}

function Topbar({ title, search, onSearch, onRefresh, refreshing, lastRefresh, refreshInterval }: TopbarProps) {
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
        <span className="muted" title={refreshInterval ? `Auto-refresh every ${formatInterval(refreshInterval)}` : 'Auto-refresh is off'}>
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Not refreshed yet'}
        </span>
        <button className="btn" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      </div>
    </header>
  )
}

export default Topbar
