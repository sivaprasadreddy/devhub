import EmptyState from '../components/EmptyState'

const sections = [
  { title: 'Recent commits', description: 'Commits and active branches across projects.' },
  { title: 'Contributors', description: 'Contributors and recent contributions.' },
  { title: 'Workflow runs', description: 'Latest CI runs and failed builds.' },
  { title: 'Releases', description: 'Latest releases and tags.' },
]

function Insights() {
  return (
    <div className="page two-column">
      {sections.map((s) => (
        <section key={s.title} className="panel">
          <div className="panel-header"><h2>{s.title}</h2></div>
          <EmptyState title="No data yet" description={s.description} />
        </section>
      ))}
    </div>
  )
}

export default Insights
