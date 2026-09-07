import { useEffect, useState } from 'react'

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
}

const retryMessage = 'We could not save that change. Please try again.'

function savedSignal(feeling, signal) {
  return {
    ...getComfortSignal(feeling),
    ...signal,
    percentage: signal?.status === 'available' ? signal.percentage : null,
  }
}

export default function useDashboardData(user, profile) {
  const [state, setState] = useState(demoState)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    loadDashboard(user.id, profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
      .then((next) => { if (active) { setState(next); setError('') } })
      .catch(() => { if (active) setError('We could not load your latest life notes. Refresh to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, profile?.timezone])

  async function persist(action, rollback) {
    try {
      await action()
      setError('')
      return true
    } catch {
      rollback?.()
      setError(retryMessage)
      return false
    }
  }

  return {
    ...state,
    loading,
    error,
    selectMood: (mood) => {
      const previousMood = state.selectedMood
      setState((current) => ({ ...current, selectedMood: mood }))
      if (user) persist(
        () => saveMood(user.id, mood, profile?.timezone || 'UTC'),
        () => setState((current) => ({ ...current, selectedMood: previousMood })),
      )
    },
    selectFeeling: (feeling) => {
      const previousFeeling = state.selectedFeeling
      const previousSignal = state.signal
      setState((current) => ({ ...current, selectedFeeling: feeling }))
      if (user) persist(async () => {
        const signal = await saveFeeling(user.id, feeling)
        if (signal) setState((current) => ({ ...current, signal: savedSignal(feeling, signal) }))
      }, () => setState((current) => ({ ...current, selectedFeeling: previousFeeling, signal: previousSignal })))
      else setState((current) => ({ ...current, signal: getComfortSignal(feeling) }))
    },
    addHighlight: (content) => {
      if (!user) {
        setState((current) => ({ ...current, highlights: [{ id: current.highlights.length + 1, entry: content, compliment: `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`, complimentStatus: 'fallback', time: 'Now' }, ...current.highlights] }))
        return
      }
      const temporaryId = `pending-${Date.now()}`
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
      const previousMetrics = state.metrics
      const nextMetrics = previousMetrics.map((metric) => metric.id === id ? { ...metric, value: Math.max(0, Number((metric.value + delta).toFixed(1))) } : metric)
      setState((current) => ({ ...current, metrics: nextMetrics }))
      if (user) await persist(
        () => saveHealth(user.id, nextMetrics, profile?.timezone || 'UTC'),
        () => setState((current) => ({ ...current, metrics: previousMetrics })),
      )
    },
    toggleMilestone: async (id) => {
      const previousGoal = state.goal
      const current = previousGoal.milestones.find((milestone) => milestone.id === id)
      const complete = !current.complete
      setState((currentState) => ({ ...currentState, goal: { ...currentState.goal, milestones: currentState.goal.milestones.map((milestone) => milestone.id === id ? { ...milestone, complete } : milestone) } }))
      if (user) await persist(
        () => saveMilestone(id, complete),
        () => setState((currentState) => ({ ...currentState, goal: previousGoal })),
      )
    },
  }
}
