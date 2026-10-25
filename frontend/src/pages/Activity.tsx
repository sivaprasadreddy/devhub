import EmptyState from '../components/EmptyState'

function Activity() {
  return (
    <div className="page two-column">
      <section className="panel">
        <div className="panel-header"><h2>Pull requests</h2></div>
        <EmptyState title="Not connected" description="Connect GitHub in Settings to see open PRs, drafts, and review requests." />
      </section>
      <section className="panel">
        <div className="panel-header"><h2>Issues</h2></div>
        <EmptyState title="Not connected" description="Issues assigned to you and stale items will appear here." />
      </section>
    </div>
  )
}

export default Activity
