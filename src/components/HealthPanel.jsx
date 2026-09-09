import { Activity, Apple, Droplets, MoonStar, Utensils } from 'lucide-react'

import { dashboardCardProps } from './dashboardCard.js'

const metricIcons = { water: Droplets, meals: Utensils, sleep: MoonStar, movement: Activity }

export default function HealthPanel({ metrics, meals = [], mealFeedback, onAdjustMetric, onOpenPage }) {
  const average = Math.round(
    metrics.reduce((total, metric) => total + Math.min(metric.value / metric.target, 1), 0) /
      metrics.length * 100,
  )

  return (
    <section className="panel health-panel dashboard-card" id="health" aria-labelledby="health-title"
      {...dashboardCardProps(onOpenPage, 'health', 'Diet & Health')}>
      <div className="panel-heading">
        <div>
          <span className="section-symbol symbol-moss"><Apple aria-hidden="true" size={18} /></span>
          <h2 id="health-title">Diet</h2>
          <p>A gentle glance at what your body received.</p>
        </div>
      </div>
      <div className="diet-summary">
        <strong>{meals.length ? meals.slice(0, 2).map(({ food }) => food).join(' · ') : 'No meals logged yet'}</strong>
        <span>{mealFeedback?.feedback || 'Add a meal when it feels useful.'}</span>
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
                  <span className="metric-controls">
                    <button type="button" aria-label={`Decrease ${label}`} onClick={() => onAdjustMetric?.(id, id === 'sleep' ? -0.5 : -1)}>−</button>
                    <strong>{value} <small>/ {target} {unit}</small></strong>
                    <button type="button" aria-label={`Increase ${label}`} onClick={() => onAdjustMetric?.(id, id === 'sleep' ? 0.5 : 1)}>+</button>
                  </span>
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
