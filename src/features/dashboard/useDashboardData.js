import { useEffect, useRef, useState } from 'react'

import { feelings, healthMetrics, initialGoal, initialHighlights, moods } from '../../data/demoData.js'
import { localDate } from './date.js'
import { getComfortSignal } from '../../lib/dashboard.js'
import { createHighlight, createMeal, deleteHighlight as removeHighlight, loadDashboard, saveFeeling, saveHealth, saveMilestone, saveMood, updateHighlight as saveHighlightEdit, updateTask } from '../../lib/lifeApi.js'
import { getEstimatedFeelingSignal, getMealBalance } from '../../lib/wellbeing.js'

const demoState = {
  selectedMood: moods[1].id,
  selectedFeeling: feelings[0].id,
  highlights: initialHighlights,
  meals: [],
  mealFeedback: getMealBalance([]),
  metrics: healthMetrics,
  goal: initialGoal,
  signal: getComfortSignal(feelings[0].id),
  supporting: {
    tasks: { complete: 3, total: 5, rows: [
      { id: 'demo-task-1', title: 'Make a nourishing lunch', dueDate: 'Today', isComplete: true },
      { id: 'demo-task-2', title: 'Take a short walk', dueDate: 'Today', isComplete: false },
    ] },
    study: { topic: 'UI design', entryDate: 'demo' },
    workout: { days: [14, 7, 28, 14, 7, 28, 35], todayMinutes: 30 },
    sleep: { days: [420, 400, 450, 430, 410, 440, 440], todayMinutes: 440, averageMinutes: 420 },
  },
}

const emptyState = {
  selectedMood: moods[1].id,
  selectedFeeling: feelings[0].id,
  highlights: [],
  meals: [],
  mealFeedback: getMealBalance([]),
  metrics: healthMetrics.map((metric) => ({ ...metric, value: 0 })),
  goal: null,
  signal: getComfortSignal(feelings[0].id),
  supporting: { tasks: null, study: null, workout: null, sleep: null },
}

const retryMessage = 'We could not save that change. Please try again.'

function savedSignal(feeling, signal, entryDate) {
  const estimate = getEstimatedFeelingSignal(feeling, entryDate)
  return {
    ...getComfortSignal(feeling),
    ...estimate,
    ...signal,
    percentage: signal?.status === 'available' ? signal.percentage : estimate.percentage,
    status: signal?.status === 'available' ? 'available' : 'estimated',
  }
}

function temporaryHighlightId() {
  const randomId = globalThis.crypto?.randomUUID?.()
  return `pending-${randomId || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

export default function useDashboardData(user, profile) {
  const [state, setState] = useState(() => user ? emptyState : demoState)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState('')
  const confirmedState = useRef(user ? emptyState : demoState)
  const mutationQueues = useRef(new Map())
  const mutationVersions = useRef(new Map())
  const timezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    loadDashboard(user.id, timezone)
      .then((next) => { if (active) { confirmedState.current = next; setState(next); setError('') } })
      .catch(() => { if (active) setError('We could not load your latest life notes. Refresh to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, timezone])

  function persist(key, action, onSuccess, rollback) {
    const version = (mutationVersions.current.get(key) || 0) + 1
    mutationVersions.current.set(key, version)
    const previous = mutationQueues.current.get(key) || Promise.resolve()
    const queued = previous.catch(() => undefined).then(async () => {
      const isLatest = () => mutationVersions.current.get(key) === version
      try {
        const result = await action()
        onSuccess?.(result, isLatest())
        if (isLatest()) setError('')
        return true
      } catch {
        if (isLatest()) {
          rollback?.()
          setError(retryMessage)
        }
        return false
      }
    })
    mutationQueues.current.set(key, queued)
    return queued
  }

  return {
    ...state,
    loading,
    error,
    selectMood: (mood) => {
      setState((current) => ({ ...current, selectedMood: mood }))
      if (user) persist('mood',
        () => saveMood(user.id, mood, timezone),
        () => { confirmedState.current = { ...confirmedState.current, selectedMood: mood } },
        () => setState((current) => ({ ...current, selectedMood: confirmedState.current.selectedMood })),
      )
    },
    selectFeeling: (feeling) => {
      setState((current) => ({ ...current, selectedFeeling: feeling }))
      if (user) persist('feeling', async () => {
        const signal = await saveFeeling(user.id, feeling)
        return savedSignal(feeling, signal, localDate(timezone))
      }, (signal, isLatest) => {
        const next = {
          ...confirmedState.current,
          selectedFeeling: feeling,
          signal: signal || confirmedState.current.signal,
        }
        confirmedState.current = next
        if (isLatest && signal) setState((current) => ({ ...current, signal }))
      }, () => setState((current) => ({
        ...current,
        selectedFeeling: confirmedState.current.selectedFeeling,
        signal: confirmedState.current.signal,
      })))
      else setState((current) => ({ ...current, signal: getComfortSignal(feeling) }))
    },
    addMeal: async (values) => {
      const entryDate = localDate(timezone)
      if (!user) {
        const meal = { id: `demo-meal-${Date.now()}`, entry_date: entryDate, ...values }
        setState((current) => {
          const meals = [meal, ...current.meals]
          return { ...current, meals, mealFeedback: getMealBalance(meals) }
        })
        return meal
      }
      const meal = await createMeal(user.id, { ...values, entryDate })
      setState((current) => {
        const meals = [meal, ...current.meals]
        return { ...current, meals, mealFeedback: getMealBalance(meals) }
      })
      return meal
    },
    toggleTask: (id, complete) => {
      setState((current) => {
        if (!current.supporting.tasks) return current
        const rows = current.supporting.tasks.rows.map((task) => task.id === id ? { ...task, isComplete: complete } : task)
        const completed = rows.filter(({ isComplete }) => isComplete).length
        return { ...current, supporting: { ...current.supporting, tasks: { ...current.supporting.tasks, rows, complete: completed } } }
      })
      if (user) persist(`task:${id}`, () => updateTask(user.id, id, complete), () => {
        const tasks = confirmedState.current.supporting.tasks
        if (!tasks) return
        const rows = tasks.rows.map((task) => task.id === id ? { ...task, isComplete: complete } : task)
        confirmedState.current = {
          ...confirmedState.current,
          supporting: { ...confirmedState.current.supporting, tasks: { ...tasks, rows, complete: rows.filter(({ isComplete }) => isComplete).length } },
        }
      }, () => setState((current) => ({ ...current, supporting: { ...current.supporting, tasks: confirmedState.current.supporting.tasks } })))
    },
    addHighlight: (content) => {
      if (!user) {
        setState((current) => ({ ...current, highlights: [{ id: current.highlights.length + 1, entry: content, compliment: `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`, complimentStatus: 'fallback', time: 'Now' }, ...current.highlights] }))
        return
      }
      const temporaryId = temporaryHighlightId()
      const optimistic = {
        id: temporaryId,
        entry: content,
        compliment: `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`,
        complimentStatus: 'pending',
        time: 'Now',
      }
      setState((current) => ({ ...current, highlights: [optimistic, ...current.highlights] }))
      return createHighlight(user.id, content)
        .then((saved) => {
          setState((current) => ({ ...current, highlights: current.highlights.map((highlight) =>
            highlight.id === temporaryId ? saved : highlight) }))
          setError('')
          return saved
        })
        .catch((saveError) => {
          setState((current) => ({ ...current, highlights: current.highlights.filter(({ id }) => id !== temporaryId) }))
          setError(retryMessage)
          throw saveError
        })
    },
    updateHighlight: async (id, content) => {
      const previous = state.highlights.find(({ id: highlightId }) => highlightId === id)
      if (!previous) return null
      const optimistic = { ...previous, entry: content }
      setState((current) => ({ ...current, highlights: current.highlights.map((highlight) => highlight.id === id ? optimistic : highlight) }))
      if (!user) return optimistic
      try {
        const saved = await saveHighlightEdit(user.id, id, content)
        setState((current) => ({ ...current, highlights: current.highlights.map((highlight) => highlight.id === id ? saved : highlight) }))
        setError('')
        return saved
      } catch (saveError) {
        setState((current) => ({ ...current, highlights: current.highlights.map((highlight) => highlight.id === id ? previous : highlight) }))
        setError(retryMessage)
        throw saveError
      }
    },
    deleteHighlight: async (id) => {
      const previous = state.highlights
      setState((current) => ({ ...current, highlights: current.highlights.filter(({ id: highlightId }) => highlightId !== id) }))
      if (!user) return true
      try {
        await removeHighlight(user.id, id)
        setError('')
        return true
      } catch (deleteError) {
        setState((current) => ({ ...current, highlights: previous }))
        setError(retryMessage)
        throw deleteError
      }
    },
    updateMetric: async (id, delta) => {
      const nextMetrics = state.metrics.map((metric) => metric.id === id ? { ...metric, value: Math.max(0, Number((metric.value + delta).toFixed(1))) } : metric)
      setState((current) => ({ ...current, metrics: nextMetrics }))
      if (user) await persist('health',
        () => saveHealth(user.id, nextMetrics, timezone),
        () => { confirmedState.current = { ...confirmedState.current, metrics: nextMetrics } },
        () => setState((current) => ({ ...current, metrics: confirmedState.current.metrics })),
      )
    },
    toggleMilestone: async (id) => {
      const current = state.goal.milestones.find((milestone) => milestone.id === id)
      const complete = !current.complete
      setState((currentState) => ({ ...currentState, goal: { ...currentState.goal, milestones: currentState.goal.milestones.map((milestone) => milestone.id === id ? { ...milestone, complete } : milestone) } }))
      if (user) await persist(`milestone:${id}`,
        () => saveMilestone(id, complete),
        () => {
          confirmedState.current = {
            ...confirmedState.current,
            goal: {
              ...confirmedState.current.goal,
              milestones: confirmedState.current.goal.milestones.map((milestone) =>
                milestone.id === id ? { ...milestone, complete } : milestone),
            },
          }
        },
        () => {
          const confirmed = confirmedState.current.goal.milestones.find((milestone) => milestone.id === id)
          setState((currentState) => ({
            ...currentState,
            goal: {
              ...currentState.goal,
              milestones: currentState.goal.milestones.map((milestone) =>
                milestone.id === id ? { ...milestone, complete: confirmed.complete } : milestone),
            },
          }))
        },
      )
    },
  }
}
