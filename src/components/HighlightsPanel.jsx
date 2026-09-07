import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function HighlightsPanel({ onAddHighlight }) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!entry.trim()) {
      setError('Write one small thing you want to remember.')
      return
    }
    setSaving(true)
    try {
      const result = onAddHighlight(entry.trim())
      if (result?.then) await result
      setEntry('')
      setError('')
    } catch {
      setError('That highlight could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel highlights-panel" id="highlights" aria-labelledby="highlights-title">
      <div className="panel-heading">
        <div>
          <span className="section-symbol symbol-coral"><Sparkles aria-hidden="true" size={18} /></span>
          <h2 id="highlights-title">Highlights</h2>
          <p>The small evidence that life is moving.</p>
        </div>
      </div>

      <div className="bloom-chart" role="img" aria-label="Weekly highlights blooms">
        {[40, 28, 50, 34, 42, 22].map((height, index) => (
          <span key={index} style={{ '--stem-height': `${height}px` }} />
        ))}
      </div>

      <form className="quick-highlight-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="quick-highlight-entry">Quick highlight</label>
        <input id="quick-highlight-entry" aria-label="Quick highlight" placeholder="What went well today?"
          value={entry} onChange={(event) => setEntry(event.target.value)} />
        <button type="submit" aria-label="Save quick highlight" disabled={saving}>
          <Plus aria-hidden="true" size={16} />
        </button>
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}

    </section>
  )
}
