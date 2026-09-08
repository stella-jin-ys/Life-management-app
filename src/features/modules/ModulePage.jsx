import { useEffect, useMemo, useState } from 'react'

import useModuleData from './useModuleData.js'
import { validateModuleValues } from './moduleApi.js'

const moduleCopy = {
  tasks: { eyebrow: 'Make room', title: 'Tasks', description: 'A gentle place for the next useful thing.', save: 'Save task' },
  study: { eyebrow: 'Stay curious', title: 'Study', description: 'A short note is enough to keep the thread.', save: 'Save study log' },
  workout: { eyebrow: 'Move kindly', title: 'Workout', description: 'Notice the movement you made over the last seven days.', save: 'Save workout' },
  sleeping: { eyebrow: 'Rest is real work', title: 'Sleeping', description: 'Track the sleep that helps tomorrow feel possible.', save: 'Save sleep' },
  diary: { eyebrow: 'A private page', title: 'Diary', description: 'Write what you want to remember from today.', save: 'Save diary entry' },
  finance: { eyebrow: 'Spend with clarity', title: 'Finance', description: 'A small record can make the whole picture gentler.', save: 'Save finance entry' },
}

function initialForm(module) {
  switch (module) {
    case 'tasks': return { title: '', dueDate: '' }
    case 'study': return { topic: '', notes: '' }
    case 'workout': return { activity: '', minutes: '', entryDate: '' }
    case 'sleeping': return { minutes: '', entryDate: '' }
    case 'diary': return { content: '', entryDate: '' }
    case 'finance': return { label: '', amount: '', entryDate: '' }
    default: return {}
  }
}

function displayDate(value) {
  if (!value) return 'No date set'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function money(amountCents) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amountCents / 100)
}

function WorkoutChart({ entries, dates }) {
  const minutesByDate = new Map(entries.map(({ entry_date: entryDate, minutes }) => [entryDate, minutes]))
  const values = dates.map((date) => minutesByDate.get(date) || 0)
  const maximum = Math.max(...values, 30)
  return (
    <div className="module-chart workout-chart" role="img" aria-label="Workout minutes for the last seven days">
      {dates.map((date, index) => {
        const value = values[index]
        const today = index === dates.length - 1
        return <div className={`workout-day${today ? ' today' : ''}`} key={date}>
          <span className={`workout-bar${value === 0 ? ' rest-day' : ''}`} style={{ '--bar-height': `${Math.max(8, Math.round((value / maximum) * 100))}%` }} />
          <small>{new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(`${date}T12:00:00`))}</small>
        </div>
      })}
    </div>
  )
}

function SleepChart({ entries, dates }) {
  const minutesByDate = new Map(entries.map(({ entry_date: entryDate, minutes }) => [entryDate, minutes]))
  const values = dates.map((date) => minutesByDate.get(date) || 0)
  const recorded = values.filter(Boolean)
  const average = recorded.length ? Math.round(recorded.reduce((sum, value) => sum + value, 0) / recorded.length) : 0
  const maximum = Math.max(...values, average, 480)
  const points = values.map((value, index) => `${index * (280 / (dates.length - 1))},${88 - ((value / maximum) * 70)}`).join(' ')
  const averageY = 88 - ((average / maximum) * 70)
  return (
    <div className="module-chart sleep-chart" role="img" aria-label={`Sleeping minutes for the last seven days, average ${average} minutes`}>
      <svg viewBox="0 0 280 100" aria-hidden="true" preserveAspectRatio="none">
        <line x1="0" x2="280" y1={averageY} y2={averageY} className="sleep-average" />
        <polyline points={points} className="sleep-line" />
      </svg>
      <span>Average {average ? `${Math.floor(average / 60)}h ${average % 60}m` : '—'}</span>
    </div>
  )
}

function FormFields({ module, values, onChange }) {
  const field = (name, label, options = {}) => (
    <label key={name}>{label}
      <input aria-label={label} name={name} value={values[name] || ''} onChange={onChange} {...options} />
    </label>
  )
  if (module === 'tasks') return <>{field('title', 'Task title', { required: true })}{field('dueDate', 'Due date', { type: 'date' })}</>
  if (module === 'study') return <>{field('topic', 'Topic', { required: true })}<label>Notes<textarea aria-label="Notes" name="notes" value={values.notes} onChange={onChange} /></label></>
  if (module === 'workout') return <>{field('activity', 'Activity', { required: true })}{field('minutes', 'Minutes', { inputMode: 'numeric', required: true })}{field('entryDate', 'Date', { type: 'date', required: true })}</>
  if (module === 'sleeping') return <>{field('minutes', 'Minutes', { inputMode: 'numeric', required: true })}{field('entryDate', 'Date', { type: 'date', required: true })}</>
  if (module === 'diary') return <><label>Diary entry<textarea aria-label="Diary entry" name="content" value={values.content} onChange={onChange} required /></label>{field('entryDate', 'Date', { type: 'date', required: true })}</>
  return <>{field('label', 'Label', { required: true })}{field('amount', 'Amount', { inputMode: 'decimal', placeholder: '12.50', required: true })}{field('entryDate', 'Date', { type: 'date', required: true })}</>
}

function Entries({ module, data, dates, onToggle, onDelete }) {
  if (module === 'workout') return <WorkoutChart entries={data} dates={dates} />
  if (module === 'sleeping') return <SleepChart entries={data} dates={dates} />
  if (module === 'diary') return data ? <article className="module-entry diary-preview"><p>{data.content}</p></article> : <p className="empty-state">No diary entry yet today.</p>
  if (!data.length) return <p className="empty-state">Nothing here yet. A small entry is plenty.</p>
  if (module === 'tasks') return <ul className="module-entry-list task-list">{data.map((entry) => <li key={entry.id}>
    <label><input type="checkbox" checked={entry.is_complete} onChange={(event) => onToggle(entry.id, event.target.checked)} /> <span>{entry.title}</span></label>
    <small>{displayDate(entry.due_date)}</small><button className="text-button" type="button" onClick={() => onDelete(entry.id)}>Delete</button>
  </li>)}</ul>
  if (module === 'study') return <ul className="module-entry-list">{data.map((entry) => <li key={entry.id}><strong>{entry.topic}</strong><p>{entry.notes || 'No notes added.'}</p></li>)}</ul>
  return <ul className="module-entry-list">{data.map((entry) => <li key={entry.id}><strong>{entry.label}</strong><span>{money(entry.amount_cents)}</span><small>{displayDate(entry.entry_date)}</small></li>)}</ul>
}

export default function ModulePage({ module, user, profile }) {
  const copy = moduleCopy[module]
  const timezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const { data, loading, saving, error, create, update, remove, entryDate, dates } = useModuleData(module, user, timezone)
  const [values, setValues] = useState(() => initialForm(module))
  const [formError, setFormError] = useState('')
  const entries = useMemo(() => Array.isArray(data) ? data : [], [data])

  useEffect(() => {
    setValues((current) => ({ ...current, entryDate: current.entryDate || entryDate }))
  }, [entryDate])

  useEffect(() => {
    if (module === 'diary' && data?.content) setValues((current) => ({ ...current, content: data.content, entryDate: data.entry_date }))
  }, [data, module])

  if (!copy) return null

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    try {
      validateModuleValues(module, values)
    } catch (validationError) {
      setFormError(validationError.message)
      return
    }
    setFormError('')
    const saved = await create(values)
    if (saved) setValues({ ...initialForm(module), entryDate })
  }

  return (
    <section className="module-page panel" aria-labelledby={`${module}-title`}>
      <header className="module-heading"><p className="eyebrow">{copy.eyebrow}</p><h1 id={`${module}-title`}>{copy.title}</h1><p>{copy.description}</p></header>
      <div className="module-layout">
        <form className="module-form" onSubmit={submit} noValidate>
          <FormFields module={module} values={values} onChange={change} />
          {(formError || error) && <p className="form-error" role="alert">{formError || error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : copy.save}</button>
        </form>
        <section className="module-entries" aria-label={`${copy.title} entries`}>
          {loading ? <p className="data-loading" role="status">Loading your entries…</p> : <Entries module={module} data={module === 'diary' ? data : entries} dates={dates}
            onToggle={(id, complete) => update(id, { complete })} onDelete={remove} />}
        </section>
      </div>
    </section>
  )
}
