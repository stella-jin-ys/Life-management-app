import { BatteryLow, Heart } from 'lucide-react'


export default function LowBatteryPanel({ feelings, selectedFeeling, signal, onSelectFeeling }) {

  return (
    <section className="panel battery-panel" id="battery" aria-labelledby="battery-title">
      <div className="panel-heading battery-heading">
        <div>
          <span className="section-symbol symbol-lavender"><BatteryLow aria-hidden="true" size={18} /></span>
          <h2 id="battery-title">Low battery?</h2>
          <p>Name what is taking up space.</p>
        </div>
        <Heart aria-hidden="true" size={23} strokeWidth={1.6} />
      </div>

      <div className="feeling-options" aria-label="Choose a feeling">
        {feelings.map(({ id, label }) => (
          <button type="button" key={id} aria-pressed={selectedFeeling === id}
            onClick={() => onSelectFeeling(id)}>{label}</button>
        ))}
      </div>

      <div className="comfort-signal">
        <div className="battery-meter" aria-label={signal.percentage == null ? 'Shared feeling percentage unavailable' : `${signal.percentage}% shared feeling signal`}>
          <span style={{ transform: `scaleX(${signal.percentage / 100})` }} />
        </div>
        <p className="signal-number"><strong>{signal.percentage == null ? '—' : `${signal.percentage}%`}</strong> {signal.status === 'insufficient_data' ? 'Not enough shared check-ins yet to show a comparison.' : 'of recent check-ins named something similar.'}</p>
        <p className="signal-label">{signal.status === 'insufficient_data' ? 'Private until there is enough data' : signal.status ? 'Community comfort signal' : 'Demo community signal'}</p>
      </div>

      <blockquote>{signal.affirmation}</blockquote>
    </section>
  )
}
