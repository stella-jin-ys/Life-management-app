import { Activity, Apple, Droplets, MoonStar, Utensils } from 'lucide-react'

const metricIcons = { water: Droplets, meals: Utensils, sleep: MoonStar, movement: Activity }

export default function HealthPanel({ metrics }) {
  const average = Math.round(
    metrics.reduce((total, metric) => total + Math.min(metric.value / metric.target, 1), 0) /
      metrics.length * 100,
  )

  return (
    <section className="panel health-panel" id="health" aria-labelledby="health-title">
      <div className="panel-heading">
        <div>
          <span className="section-symbol symbol-moss"><Apple aria-hidden="true" size={18} /></span>
          <h2 id="health-title">Diet</h2>
          <p>A gentle glance at what your body received.</p>
        </div>
      </div>
      <div className="diet-summary">
        <strong>Oatmeal, eggs, greens, water</strong>
        <span>Nice balance today</span>
      </div>

      <div className="health-layout">
        <div className="health-orbit" style={{ '--progress': `${average * 3.6}deg` }}
          role="img" aria-label={`Daily physical wellbeing ${average}%`}>
          <div><strong>{average}%</strong><span>today</span></div>
        </div>
        <div className="metric-list">
          {metrics.map(({ id, label, value, target, unit, tone }) => {
            const Icon = metricIcons[id]
            const percentage = Math.round(Math.min(value / target, 1) * 100)
            return (
              <div className="metric-row" key={id}>
                <div className="metric-label">
                  <Icon aria-hidden="true" size={16} />
                  <span>{label}</span>
                  <strong>{value} <small>/ {target} {unit}</small></strong>
                </div>
                <div className="metric-track" role="progressbar"
                  aria-label={`${label} progress`} aria-valuemin="0" aria-valuemax="100"
                  aria-valuenow={percentage}>
                  <span className={`tone-${tone}`} style={{ width: `${percentage}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
