import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function HighlightsPanel({ highlights = [], onAddHighlight, onOpenPage, isDemo = false }) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!entry.trim()) {
      setError('Write one small thing you want to remember.')
      return
    }
    if (isDemo) {
      onAddHighlight(entry.trim())
      setEntry('')
      setError('')
      return
    }

    setSaving(true)
    try {
      await onAddHighlight(entry.trim())
      setEntry('')
      setError('')
    } catch {
      // The dashboard-level retry message is shown while the input stays intact.
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

      {highlights.length ? <div className="highlight-feed" aria-label="Latest highlights">
        {highlights.slice(0, 4).map((highlight) => <article className="highlight-entry" key={highlight.id}>
          <Sparkles aria-hidden="true" size={14} />
          <div><strong>{highlight.entry}</strong><p>{highlight.compliment}</p><small>{highlight.time}</small></div>
        </article>)}
      </div> : <p className="dashboard-empty">Your first small win can grow here.</p>}

      {onOpenPage && <button className="panel-link" type="button" onClick={() => onOpenPage('highlights')}>View all highlights</button>}

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
