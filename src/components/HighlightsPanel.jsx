import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useState } from 'react'

export default function HighlightsPanel({ highlights = [], onAddHighlight, onUpdateHighlight, onDeleteHighlight, onOpenPage, isDemo = false }) {
  const [entry, setEntry] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!entry.trim()) {
      setError('Write one small thing you want to remember.')
      return
    }
    if (editingId) {
      setSaving(true)
      try {
        await onUpdateHighlight(editingId, entry.trim())
        setEntry('')
        setEditingId(null)
        setError('')
      } catch {
        setError('We could not update this highlight. Please try again.')
      } finally {
        setSaving(false)
      }
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

  async function remove(highlight) {
    setSaving(true)
    try {
      await onDeleteHighlight(highlight.id)
      if (editingId === highlight.id) {
        setEditingId(null)
        setEntry('')
      }
      setError('')
    } catch {
      setError('We could not delete this highlight. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function edit(highlight) {
    setEditingId(highlight.id)
    setEntry(highlight.entry)
    setError('')
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
          <div className="highlight-entry-copy"><strong>{highlight.entry}</strong></div>
          <div className="highlight-entry-actions">
            <button className="highlight-action" type="button" aria-label={`Edit ${highlight.entry}`} onClick={() => edit(highlight)} disabled={saving}><Pencil aria-hidden="true" size={13} /></button>
            <button className="highlight-action" type="button" aria-label={`Delete ${highlight.entry}`} onClick={() => remove(highlight)} disabled={saving}><Trash2 aria-hidden="true" size={13} /></button>
          </div>
        </article>)}
      </div> : <p className="dashboard-empty">Your first small win can grow here.</p>}

      <form className="quick-highlight-form" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="quick-highlight-entry">Quick highlight</label>
        <input id="quick-highlight-entry" aria-label="Quick highlight" placeholder="What went well today?"
          value={entry} onChange={(event) => setEntry(event.target.value)} />
        <button type="submit" aria-label={editingId ? 'Save highlight edit' : 'Save quick highlight'} disabled={saving}>
          <Plus aria-hidden="true" size={16} />
        </button>
        {editingId && <button className="cancel-highlight-edit" type="button" aria-label="Cancel highlight edit" onClick={() => { setEditingId(null); setEntry('') }} disabled={saving}><X aria-hidden="true" size={15} /></button>}
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}
      {onOpenPage && <button className="panel-link" type="button" onClick={() => onOpenPage('highlights')}>View all highlights</button>}

    </section>
  )
}
