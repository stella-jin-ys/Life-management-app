import { useEffect, useRef, useState } from 'react'

import { feelings, healthMetrics, initialGoal, initialHighlights, moods } from '../../data/demoData.js'
import { getComfortSignal } from '../../lib/dashboard.js'
import { createHighlight, loadDashboard, saveFeeling, saveHealth, saveMilestone, saveMood } from '../../lib/lifeApi.js'

const demoState = {
  selectedMood: moods[1].id,
  selectedFeeling: feelings[0].id,
  highlights: initialHighlights,
  metrics: healthMetrics,
  goal: initialGoal,
  signal: getComfortSignal(feelings[0].id),
  supporting: {
    tasks: { complete: 3, total: 5 },
    study: { topic: 'UI design', entryDate: 'demo' },
    workout: { days: [14, 7, 28, 14, 7, 28, 35], todayMinutes: 30 },
    sleep: { days: [420, 400, 450, 430, 410, 440, 440], todayMinutes: 440, averageMinutes: 420 },
  },
}

const emptyState = {
  selectedMood: moods[1].id,
  selectedFeeling: feelings[0].id,
  highlights: [],
  metrics: healthMetrics.map((metric) => ({ ...metric, value: 0 })),
  goal: null,
  signal: getComfortSignal(feelings[0].id),
  supporting: { tasks: null, study: null, workout: null, sleep: null },
}

const retryMessage = 'We could not save that change. Please try again.'

function savedSignal(feeling, signal) {
  return {
    ...getComfortSignal(feeling),
    ...signal,
    percentage: signal?.status === 'available' ? signal.percentage : null,
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
        return signal ? savedSignal(feeling, signal) : null
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
