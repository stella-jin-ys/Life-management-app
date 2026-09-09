import { useEffect, useMemo, useState } from 'react'

import { healthMetrics } from '../../data/demoData.js'
import { localDate } from '../dashboard/date.js'
import { createMeal, deleteMeal, loadDashboard, saveHealth, listMeals } from '../../lib/lifeApi.js'
import { getMealBalance } from '../../lib/wellbeing.js'

const initialMeal = { mealType: 'breakfast', food: '', hasProduce: false, hasProtein: false, hasCarbohydrate: false, hasHealthyFat: false }

export default function HealthPage({ user, profile }) {
  const timezone = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const [meals, setMeals] = useState(user ? [] : [{ id: 'demo-meal-1', food: 'Yogurt and berries', meal_type: 'breakfast', has_produce: true, has_protein: true }])
  const [metrics, setMetrics] = useState(user ? healthMetrics.map((metric) => ({ ...metric, value: 0 })) : healthMetrics)
  const [values, setValues] = useState(initialMeal)
  const [loading, setLoading] = useState(Boolean(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const feedback = useMemo(() => getMealBalance(meals), [meals])

  useEffect(() => {
    if (!user) return undefined
    let active = true
    setLoading(true)
    Promise.all([listMeals(user.id, localDate(timezone)), loadDashboard(user.id, timezone)])
      .then(([nextMeals, dashboard]) => {
        if (!active) return
        setMeals(nextMeals)
        setMetrics(dashboard.metrics)
      })
      .catch(() => { if (active) setError('We could not load your health log. Refresh to try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [timezone, user?.id])

  function changeMeal(event) {
    const { name, type, checked, value } = event.target
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function submitMeal(event) {
    event.preventDefault()
    if (!values.food.trim()) { setError('Add the food you want to remember.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = user ? await createMeal(user.id, { ...values, entryDate: localDate(timezone) }) : {
        id: `demo-meal-${Date.now()}`, entry_date: localDate(timezone), meal_type: values.mealType, food: values.food.trim(),
        has_produce: values.hasProduce, has_protein: values.hasProtein, has_carbohydrate: values.hasCarbohydrate, has_healthy_fat: values.hasHealthyFat,
      }
      setMeals((current) => [saved, ...current])
      setValues(initialMeal)
    } catch {
      setError('We could not save this meal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function adjustMetric(id, delta) {
    const nextMetrics = metrics.map((metric) => metric.id === id ? { ...metric, value: Math.max(0, Number((metric.value + delta).toFixed(1))) } : metric)
    setMetrics(nextMetrics)
    if (user) {
      try { await saveHealth(user.id, nextMetrics, timezone) } catch { setError('We could not save this health change. Please try again.') }
    }
  }

  async function removeMeal(id) {
    if (user) {
      try { await deleteMeal(id) } catch { setError('We could not remove this meal. Please try again.'); return }
    }
    setMeals((current) => current.filter((meal) => meal.id !== id))
  }

  return (
    <section className="feature-page panel" aria-labelledby="health-page-title">
      <header className="module-heading"><p className="eyebrow">Nourish gently</p><h1 id="health-page-title">Diet & health</h1><p>Record what helped your body today without turning care into a score.</p></header>
      <div className="module-layout health-page-layout">
        <form className="module-form" onSubmit={submitMeal} noValidate>
          <label>Meal type<select name="mealType" value={values.mealType} onChange={changeMeal}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
          <label>Food<textarea aria-label="Food" name="food" value={values.food} onChange={changeMeal} placeholder="Rice bowl, yogurt, berries…" required /></label>
          <fieldset className="meal-groups"><legend>Balance groups</legend>
            <label><input aria-label="Produce" type="checkbox" name="hasProduce" checked={values.hasProduce} onChange={changeMeal} /> Produce</label>
            <label><input aria-label="Protein" type="checkbox" name="hasProtein" checked={values.hasProtein} onChange={changeMeal} /> Protein</label>
            <label><input aria-label="Carbohydrate" type="checkbox" name="hasCarbohydrate" checked={values.hasCarbohydrate} onChange={changeMeal} /> Carbohydrate</label>
            <label><input aria-label="Healthy fat" type="checkbox" name="hasHealthyFat" checked={values.hasHealthyFat} onChange={changeMeal} /> Healthy fat</label>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save meal'}</button>
        </form>
        <section className="module-entries" aria-label="Diet and health log">
          {loading ? <p className="data-loading" role="status">Loading today’s health…</p> : <>
            <div className="meal-feedback"><strong>{feedback.score}% balance groups represented</strong><p>{feedback.feedback}</p></div>
            {meals.length ? meals.map((meal) => <article className="module-entry meal-log-entry" key={meal.id}><strong>{meal.food}</strong><small>{meal.meal_type}</small><button className="text-button" type="button" onClick={() => removeMeal(meal.id)}>Remove</button></article>) : <p className="empty-state">No meals logged yet.</p>}
            <div className="metric-list health-page-metrics">{metrics.map((metric) => <div className="metric-row" key={metric.id}><div className="metric-label"><span>{metric.label}</span><span className="metric-controls"><button type="button" aria-label={`Decrease ${metric.label}`} onClick={() => adjustMetric(metric.id, metric.id === 'sleep' ? -0.5 : -1)}>−</button><strong>{metric.value} <small>/ {metric.target} {metric.unit}</small></strong><button type="button" aria-label={`Increase ${metric.label}`} onClick={() => adjustMetric(metric.id, metric.id === 'sleep' ? 0.5 : 1)}>+</button></span></div></div>)}</div>
          </>}
        </section>
      </div>
    </section>
  )
}
