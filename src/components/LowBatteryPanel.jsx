import { BatteryLow, Heart } from 'lucide-react'

import { getComfortSignal } from '../lib/dashboard.js'

export default function LowBatteryPanel({ feelings, selectedFeeling, onSelectFeeling }) {
  const signal = getComfortSignal(selectedFeeling)

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
        <div className="battery-meter" aria-label={`${signal.percentage}% shared feeling demo signal`}>
          <span style={{ transform: `scaleX(${signal.percentage / 100})` }} />
        </div>
        <p className="signal-number"><strong>{signal.percentage}%</strong> of today’s demo check-ins named something similar.</p>
        <p className="signal-label">Demo community signal</p>
      </div>

      <blockquote>{signal.affirmation}</blockquote>
    </section>
  )
}
