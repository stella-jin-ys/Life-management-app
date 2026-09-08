import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createFinanceEntry,
  createStudyLog,
  createTask,
  deleteTask,
  getDiaryEntry,
  listFinanceEntries,
  listSleepEntries,
  listStudyLogs,
  listTasks,
  listWorkoutEntries,
  toggleTask,
  upsertDiaryEntry,
  upsertSleepEntry,
  upsertWorkoutEntry,
  validateModuleValues,
} from './moduleApi.js'
import { localDate } from '../dashboard/date.js'

const saveError = 'We could not save this entry. Please try again.'
const loadError = 'We could not load this page. Refresh to try again.'

function recentDates(timezone, today = localDate(timezone)) {
  const anchor = new Date(`${today}T12:00:00.000Z`)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchor)
    date.setUTCDate(anchor.getUTCDate() - (6 - index))
    return date.toISOString().slice(0, 10)
  })
}

function emptyData(module) {
  return module === 'diary' ? null : []
}

function entryId() {
  return `demo-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

function demoEntry(module, values, entryDate) {
  const normalized = validateModuleValues(module, values)
  const base = { id: entryId(), entry_date: entryDate }
  switch (module) {
    case 'tasks': return { ...base, title: normalized.title, due_date: normalized.dueDate, is_complete: false }
    case 'study': return { ...base, topic: normalized.topic, notes: normalized.notes }
    case 'workout': return { ...base, activity: normalized.activity, minutes: normalized.minutes }
    case 'sleeping': return { ...base, minutes: normalized.minutes }
    case 'diary': return { ...base, content: normalized.content }
    case 'finance': return { ...base, label: normalized.label, amount_cents: normalized.amountCents }
    default: throw new Error('Choose a valid module.')
  }
}

function mergeEntry(module, current, saved) {
  if (module === 'diary') return saved
  const index = current.findIndex(({ id, entry_date: entryDate }) => id === saved.id || (
    ['workout', 'sleeping'].includes(module) && entryDate === saved.entry_date
  ))
  if (index < 0) return [saved, ...current]
  return current.map((entry, entryIndex) => entryIndex === index ? saved : entry)
}

export default function useModuleData(module, user, timezone = 'UTC') {
  const userId = user?.id
  const [data, setData] = useState(() => emptyData(module))
  const [today, setToday] = useState(() => localDate(timezone))
  const [loading, setLoading] = useState(Boolean(userId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dates = useMemo(() => recentDates(timezone, today), [timezone, today])
  const entryDate = dates.at(-1)

  useEffect(() => {
    function refreshDay() {
      const next = localDate(timezone)
      setToday((current) => current === next ? current : next)
    }
    refreshDay()
    const interval = window.setInterval(refreshDay, 60_000)
    document.addEventListener('visibilitychange', refreshDay)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshDay)
    }
  }, [timezone])

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return emptyData(module)
    }
    setLoading(true)
    try {
      let next
      switch (module) {
        case 'tasks': next = await listTasks(userId); break
        case 'study': next = await listStudyLogs(userId, timezone); break
        case 'workout': next = await listWorkoutEntries(userId, dates[0], entryDate); break
        case 'sleeping': next = await listSleepEntries(userId, dates[0], entryDate); break
        case 'diary': next = await getDiaryEntry(userId, entryDate, timezone); break
        case 'finance': next = await listFinanceEntries(userId, dates[0], entryDate); break
        default: throw new Error('Choose a valid module.')
      }
      setData(next)
      setError('')
      return next
    } catch {
      setError(loadError)
      return emptyData(module)
    } finally {
      setLoading(false)
    }
  }, [dates, entryDate, module, timezone, userId])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(async (values) => {
    const currentEntryDate = localDate(timezone)
    if (currentEntryDate !== today) setToday(currentEntryDate)
    setSaving(true)
    try {
      let saved
      if (!userId) {
        saved = demoEntry(module, values, values.entryDate || currentEntryDate)
      } else {
        switch (module) {
          case 'tasks': saved = await createTask(userId, values.title, values.dueDate); break
          case 'study': saved = await createStudyLog(userId, values.topic, values.notes, timezone); break
          case 'workout': saved = await upsertWorkoutEntry(userId, values.entryDate || currentEntryDate, values.activity, values.minutes); break
          case 'sleeping': saved = await upsertSleepEntry(userId, values.entryDate || currentEntryDate, values.minutes); break
          case 'diary': saved = await upsertDiaryEntry(userId, values.entryDate || currentEntryDate, values.content, timezone); break
          case 'finance': saved = await createFinanceEntry(userId, values.entryDate || currentEntryDate, values.label, validateModuleValues('finance', values).amountCents); break
          default: throw new Error('Choose a valid module.')
        }
      }
      setData((current) => mergeEntry(module, current, saved))
      setError('')
      return true
    } catch {
      setError(saveError)
      return false
    } finally {
      setSaving(false)
    }
  }, [entryDate, module, timezone, userId, today])

  const update = useCallback(async (id, values) => {
    setSaving(true)
    try {
      let saved
      if (module === 'tasks') {
        saved = userId ? await toggleTask(id, values.complete) : { ...data.find((entry) => entry.id === id), is_complete: Boolean(values.complete) }
      } else {
        const success = await create({ ...values, entryDate: values.entryDate || entryDate })
        return success
      }
      setData((current) => mergeEntry(module, current, saved))
      setError('')
      return true
    } catch {
      setError(saveError)
      return false
    } finally {
      setSaving(false)
    }
  }, [create, data, entryDate, module, userId])

  const remove = useCallback(async (id) => {
    if (module !== 'tasks') return false
    setSaving(true)
    try {
      if (userId) await deleteTask(id)
      setData((current) => current.filter((entry) => entry.id !== id))
      setError('')
      return true
    } catch {
      setError(saveError)
      return false
    } finally {
      setSaving(false)
    }
  }, [module, userId])

  return { data, loading, saving, error, reload: load, create, update, remove, entryDate, dates }
}
