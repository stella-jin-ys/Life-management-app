import { ArrowRight, Check, Flag } from 'lucide-react'

export default function GoalsPanel({ goal, onToggleMilestone }) {
  const next = goal?.milestones.find(({ complete }) => !complete)

  return (
    <section className="panel goals-panel" id="goals" aria-labelledby="goals-title">
      <div className="panel-heading">
        <div>
          <span className="section-symbol symbol-gold"><Flag aria-hidden="true" size={18} /></span>
          <h2 id="goals-title">Goals</h2>
          <p>{goal?.why || 'Set one small intention when you are ready.'}</p>
        </div>
      </div>

      <h3>{goal?.title || 'No goal set yet'}</h3>

      <div className="milestone-list">
        {goal?.milestones.map(({ id, label, complete }) => (
          <label className="milestone" key={id}>
            <input type="checkbox" checked={complete}
              onChange={() => onToggleMilestone(id)} />
            <span className="custom-check" aria-hidden="true"><Check size={14} /></span>
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="next-step">
        <span>Next gentle step</span>
        <p>{next ? next.label : 'Pause and notice how far you came.'}</p>
        <ArrowRight aria-hidden="true" size={18} />
      </div>
    </section>
  )
}
