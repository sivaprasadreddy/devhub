interface SummaryCardProps {
  label: string
  value: number | string
  tone?: 'default' | 'warning' | 'danger'
}

function SummaryCard({ label, value, tone = 'default' }: SummaryCardProps) {
  return (
    <div className={`summary-card tone-${tone}`}>
      <span className="summary-value">{value}</span>
      <span className="summary-label">{label}</span>
    </div>
  )
}

export default SummaryCard
