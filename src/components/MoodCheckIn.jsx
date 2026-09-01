import { CloudSun, Feather, Sparkle, Waves } from 'lucide-react'

const moodIcons = { bright: Sparkle, steady: Waves, tender: Feather, heavy: CloudSun }

export default function MoodCheckIn({ moods, selectedMood, onSelect }) {
  const selected = moods.find(({ id }) => id === selectedMood)

  return (
    <section className="mood-checkin" aria-labelledby="mood-title">
      <div className="mood-copy">
        <h2 id="mood-title">How are you arriving today?</h2>
        <p>{selected.note}</p>
      </div>
      <div className="mood-options" aria-label="Choose today's mood">
        {moods.map(({ id, label }) => {
          const Icon = moodIcons[id]
          return (
            <button type="button" key={id} className="mood-option"
              aria-pressed={selectedMood === id} onClick={() => onSelect(id)}>
              <Icon aria-hidden="true" size={18} />
              {label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
