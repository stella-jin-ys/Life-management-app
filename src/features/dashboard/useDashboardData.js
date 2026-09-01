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

  async function persist(action) {
    try { await action(); return true } catch { setError('That note could not be saved. Please try again.'); return false }
  }

  return {
    ...state,
    loading,
    error,
    selectMood: (mood) => {
      setState((current) => ({ ...current, selectedMood: mood }))
      if (user) persist(() => saveMood(user.id, mood, profile?.timezone || 'UTC'))
    },
    selectFeeling: (feeling) => {
      setState((current) => ({ ...current, selectedFeeling: feeling }))
      if (user) persist(async () => {
        const signal = await saveFeeling(user.id, feeling)
        if (signal) setState((current) => ({ ...current, signal: { ...getComfortSignal(feeling), ...signal } }))
      })
      else setState((current) => ({ ...current, signal: getComfortSignal(feeling) }))
    },
    addHighlight: (content) => {
      if (!user) {
        setState((current) => ({ ...current, highlights: [{ id: current.highlights.length + 1, entry: content, compliment: `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`, time: 'Now' }, ...current.highlights] }))
        return
      }
      return (async () => {
        try {
          const saved = await createHighlight(user.id, content)
          setState((current) => ({ ...current, highlights: [saved, ...current.highlights] }))
        } catch (saveError) {
          setError('That highlight could not be saved. Please try again.')
          throw saveError
        }
      })()
    },
    updateMetric: async (id, delta) => {
      const nextMetrics = state.metrics.map((metric) => metric.id === id ? { ...metric, value: Math.max(0, Number((metric.value + delta).toFixed(1))) } : metric)
      setState((current) => ({ ...current, metrics: nextMetrics }))
      if (user) await persist(() => saveHealth(user.id, nextMetrics, profile?.timezone || 'UTC'))
    },
    toggleMilestone: async (id) => {
      const current = state.goal.milestones.find((milestone) => milestone.id === id)
      const complete = !current.complete
      setState((currentState) => ({ ...currentState, goal: { ...currentState.goal, milestones: currentState.goal.milestones.map((milestone) => milestone.id === id ? { ...milestone, complete } : milestone) } }))
      if (user) await persist(() => saveMilestone(id, complete))
    },
  }
}
