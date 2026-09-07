import { HeartHandshake } from 'lucide-react'


export default function LowBatteryPanel({ feelings, selectedFeeling, signal, onSelectFeeling }) {
  const percentage = signal.status === 'available' || !signal.status ? signal.percentage : null

  return (
    <section className="panel battery-panel" id="battery" aria-labelledby="battery-title">
      <div className="panel-heading battery-heading">
        <div>
          <span className="section-symbol symbol-lavender"><HeartHandshake aria-hidden="true" size={18} /></span>
          <h2 id="battery-title">Low battery</h2>
          <p>Name what is taking up space.</p>
        </div>
      </div>

      <div className="compact-signal">
        <strong>{percentage == null ? '—' : `${percentage}%`}</strong>
        <span>{signal.status === 'insufficient_data' ? 'private until there is enough data' : 'feel this too · demo signal'}</span>
      </div>

      <div className="feeling-options" aria-label="Choose a feeling">
        {feelings.map(({ id, label }) => (
          <button type="button" key={id} aria-pressed={selectedFeeling === id}
            onClick={() => onSelectFeeling(id)}>{label}</button>
        ))}
      </div>

      <div className="comfort-signal">
        <div className="battery-meter" aria-label={percentage == null ? 'Shared feeling percentage unavailable' : `${percentage}% shared feeling signal`}>
          <span style={{ transform: `scaleX(${(percentage || 0) / 100})` }} />
        </div>
        <p className="signal-number"><strong>{percentage == null ? '—' : `${percentage}%`}</strong> {signal.status === 'insufficient_data' ? 'Not enough shared check-ins yet to show a comparison.' : 'of recent check-ins named something similar.'}</p>
        <p className="signal-label">{signal.status === 'insufficient_data' ? 'Private until there is enough data' : signal.status ? 'Community comfort signal' : 'Demo community signal'}</p>
      </div>

      <blockquote>{signal.affirmation}</blockquote>
    </section>
  )
}
