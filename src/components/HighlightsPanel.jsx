import { ArrowUpRight, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function HighlightsPanel({ highlights, onAddHighlight }) {
  const [adding, setAdding] = useState(false)
  const [entry, setEntry] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!entry.trim()) {
      setError('Write one small thing you want to remember.')
      return
    }
    onAddHighlight(entry.trim())
    setEntry('')
    setError('')
    setAdding(false)
  }

  return (
    <section className="panel highlights-panel" id="highlights" aria-labelledby="highlights-title">
      <div className="panel-heading">
        <div>
          <span className="section-symbol symbol-coral"><Sparkles aria-hidden="true" size={18} /></span>
          <h2 id="highlights-title">Today’s highlights</h2>
          <p>The small evidence that life is moving.</p>
        </div>
        <button className="icon-action" type="button" aria-label="Add a highlight"
          onClick={() => setAdding((value) => !value)}>
          <Plus aria-hidden="true" />
        </button>
      </div>

      {adding && (
        <form className="highlight-form" onSubmit={submit}>
          <label htmlFor="highlight-entry">What felt good or moved forward?</label>
          <textarea id="highlight-entry" value={entry} rows="3"
            onChange={(event) => setEntry(event.target.value)} />
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="text-button" type="button" onClick={() => setAdding(false)}>Cancel</button>
            <button className="primary-button" type="submit">Save highlight</button>
          </div>
        </form>
      )}

      <div className="highlight-feed" aria-live="polite">
        {highlights.map(({ id, entry: item, compliment, time }) => (
          <article className="highlight-entry" key={id}>
            <div className="highlight-time"><span aria-hidden="true" />{time}</div>
            <div>
              <h3>{item}</h3>
              <p>{compliment}</p>
            </div>
            <ArrowUpRight aria-hidden="true" size={17} />
          </article>
        ))}
      </div>
    </section>
  )
}
