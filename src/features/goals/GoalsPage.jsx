import { useEffect, useState } from 'react'

import { initialGoal } from '../../data/demoData.js'
import {
  createGoal,
  createMilestone,
  listGoals,
  saveMilestone,
  updateGoalStatus,
} from '../../lib/lifeApi.js'

function demoGoal() {
  return {
    id: 'demo-goal-1',
    title: initialGoal.title,
    why: initialGoal.why,
    status: 'active',
    milestones: initialGoal.milestones.map((milestone) => ({ ...milestone })),
  }
}

export default function GoalsPage({ user }) {
  const [goals, setGoals] = useState(() => user ? [] : [demoGoal()])
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [milestones, setMilestones] = useState({})
  const [loading, setLoading] = useState(Boolean(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    let active = true
    setLoading(true)
    listGoals(user.id)
      .then((next) => { if (active) setGoals(next) })
      .catch(() => { if (active) setError('We could not load your goals. Refresh to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id])

  async function submitGoal(event) {
    event.preventDefault()
    if (!title.trim()) { setError('Give your goal a name to keep it visible.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = user ? await createGoal(user.id, title, why) : {
        id: `demo-goal-${Date.now()}`, title: title.trim(), why: why.trim(), status: 'active', milestones: [],
      }
      setGoals((current) => [...current, saved])
      setTitle('')
      setWhy('')
    } catch {
      setError('We could not save this goal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function addMilestone(goal) {
    const label = (milestones[goal.id] || '').trim()
    if (!label) return
    setSaving(true)
    setError('')
    try {
      const saved = user ? await createMilestone(goal.id, label, goal.milestones.length) : {
        id: `demo-milestone-${Date.now()}`, label, is_complete: false,
      }
      setGoals((current) => current.map((item) => item.id === goal.id
        ? { ...item, milestones: [...item.milestones, { id: saved.id, label: saved.label, complete: saved.is_complete || saved.complete || false }] }
        : item))
      setMilestones((current) => ({ ...current, [goal.id]: '' }))
    } catch {
      setError('We could not add that milestone. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleMilestone(goal, milestone) {
    const complete = !milestone.complete
    setGoals((current) => current.map((item) => item.id === goal.id
      ? { ...item, milestones: item.milestones.map((entry) => entry.id === milestone.id ? { ...entry, complete } : entry) }
      : item))
    if (user) {
      try { await saveMilestone(milestone.id, complete) } catch { setError('We could not save that milestone. Please try again.') }
    }
  }

  async function toggleGoal(goal) {
    const status = goal.status === 'completed' ? 'active' : 'completed'
    setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, status } : item))
    if (user) {
      try {
        const saved = await updateGoalStatus(goal.id, status)
        setGoals((current) => current.map((item) => item.id === goal.id ? saved : item))
      } catch { setError('We could not update this goal. Please try again.') }
    }
  }

  return (
    <section className="feature-page panel" aria-labelledby="goals-page-title">
      <header className="module-heading"><p className="eyebrow">Keep moving forward</p><h1 id="goals-page-title">Goals</h1><p>Turn something that matters into the next kind, visible step.</p></header>
      <div className="module-layout goals-page-layout">
        <form className="module-form" onSubmit={submitGoal} noValidate>
          <label>Goal title<input aria-label="Goal title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Learn something that matters" required /></label>
          <label>Why it matters<textarea aria-label="Why it matters" value={why} onChange={(event) => setWhy(event.target.value)} placeholder="What will this make possible?" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create goal'}</button>
        </form>
        <section className="module-entries goal-list" aria-label="Goal board">
          {loading ? <p className="data-loading" role="status">Loading your goals…</p> : goals.length ? goals.map((goal) => <article className={`goal-card${goal.status === 'completed' ? ' is-complete' : ''}`} key={goal.id}>
            <div className="goal-card-heading"><div><span className="eyebrow">{goal.status === 'completed' ? 'Completed' : 'In motion'}</span><h2>{goal.title}</h2></div><button className="text-button" type="button" onClick={() => toggleGoal(goal)}>{goal.status === 'completed' ? 'Reopen' : 'Mark complete'}</button></div>
            {goal.why && <p>{goal.why}</p>}
            <ul className="goal-milestones">{goal.milestones.map((milestone) => <li key={milestone.id}><label><input type="checkbox" checked={milestone.complete} onChange={() => toggleMilestone(goal, milestone)} /> <span>{milestone.label}</span></label></li>)}</ul>
            <div className="goal-add-milestone"><input aria-label={`Milestone for ${goal.title}`} value={milestones[goal.id] || ''} onChange={(event) => setMilestones((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="Add a milestone" /><button className="button-small" type="button" onClick={() => addMilestone(goal)} disabled={saving}>Add</button></div>
          </article>) : <p className="empty-state">Your next meaningful goal can start here.</p>}
        </section>
      </div>
    </section>
  )
}
