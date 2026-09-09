import { useEffect, useState } from 'react'

import { initialHighlights } from '../../data/demoData.js'
import { createHighlight, listHighlights } from '../../lib/lifeApi.js'

function demoHighlight(content) {
  return {
    id: `demo-highlight-${Date.now()}`,
    entry: content,
    compliment: `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`,
    complimentStatus: 'fallback',
    time: 'Now',
  }
}

export default function HighlightsPage({ user }) {
  const [items, setItems] = useState(user ? [] : initialHighlights)
  const [entry, setEntry] = useState('')
  const [loading, setLoading] = useState(Boolean(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let active = true
    setLoading(true)
    listHighlights(user.id)
      .then((next) => { if (active) setItems(next) })
      .catch(() => { if (active) setError('We could not load your highlights. Refresh to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  async function submit(event) {
    event.preventDefault()
    const content = entry.trim()
    if (!content) { setError('Write one small thing you want to remember.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = user ? await createHighlight(user.id, content) : demoHighlight(content)
      setItems((current) => [saved, ...current])
      setEntry('')
    } catch {
      setError('We could not save this highlight. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="feature-page panel" aria-labelledby="highlights-page-title">
      <header className="module-heading"><p className="eyebrow">Notice the good</p><h1 id="highlights-page-title">Highlights</h1><p>Keep small wins close enough to become evidence.</p></header>
      <div className="module-layout">
        <form className="module-form" onSubmit={submit} noValidate>
          <label>Highlight
            <textarea aria-label="Highlight" value={entry} onChange={(event) => setEntry(event.target.value)} placeholder="What went well today?" required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save highlight'}</button>
        </form>
        <section className="module-entries" aria-label="Highlight log">
          {loading ? <p className="data-loading" role="status">Loading your highlights…</p> : items.length ? items.map((item) => <article className="module-entry highlight-log-entry" key={item.id}>
            <strong>{item.entry}</strong><small>{item.time}</small><p>{item.compliment}</p>
          </article>) : <p className="empty-state">Your first small win can grow here.</p>}
        </section>
      </div>
    </section>
  )
}
