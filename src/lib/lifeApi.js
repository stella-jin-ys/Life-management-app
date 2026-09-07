import { feelings, healthMetrics, initialGoal, moods } from '../data/demoData.js'
import { localDate } from '../features/dashboard/date.js'
import { getComfortSignal } from './dashboard.js'
import { supabase } from './supabase/client.js'

const defaultHealth = { hydration_glasses: 5, nourishing_meals: 2, sleep_minutes: 432, movement_minutes: 24 }

export { localDate }

function requireClient() {
  if (!supabase) throw new Error('Supabase browser configuration is missing')
  return supabase
}

function timeLabel(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function mapHighlight(item) {
  return {
    id: item.id,
    entry: item.content,
    compliment: item.compliment || 'Your win is worth noticing. A small step is still movement.',
    complimentStatus: item.compliment_status || 'pending',
    time: timeLabel(item.created_at),
  }
}

function fallbackCompliment(content) {
  return `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`
}

function mapGoal(goal) {
  return {
    id: goal.id,
    title: goal.title,
    why: goal.why,
    milestones: [...(goal.milestones || [])]
      .sort((a, b) => a.position - b.position)
      .map((milestone) => ({ id: milestone.id, label: milestone.label, complete: milestone.is_complete })),
  }
}

function mapHealth(row) {
  const values = row || defaultHealth
  return [
    { ...healthMetrics[0], value: values.hydration_glasses },
    { ...healthMetrics[1], value: values.nourishing_meals },
    { ...healthMetrics[2], value: Number((values.sleep_minutes / 60).toFixed(1)) },
    { ...healthMetrics[3], value: values.movement_minutes },
  ]
}

export async function loadDashboard(userId, timezone = 'UTC') {
  const client = requireClient()
  const entryDate = localDate(timezone)
  const [moodResult, highlightsResult, healthResult, goalsResult, signalResult] = await Promise.all([
    client.from('mood_entries').select('mood').eq('user_id', userId).eq('entry_date', entryDate).maybeSingle(),
    client.from('highlights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    client.from('health_entries').select('*').eq('user_id', userId).eq('entry_date', entryDate).maybeSingle(),
    client.from('goals').select('*, milestones(*)').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: true }).limit(1),
    client.rpc('get_comfort_signal', { p_feeling: 'drained' }),
  ])
  const failed = [moodResult, highlightsResult, healthResult, goalsResult, signalResult].find(({ error }) => error)
  if (failed) throw failed.error

  let goalRow = goalsResult.data?.[0]
  if (!goalRow) {
    const { data: created, error: goalError } = await client.from('goals').insert({
      user_id: userId, title: initialGoal.title, why: initialGoal.why,
    }).select().single()
    if (goalError) throw goalError
    const { data: milestones, error: milestoneError } = await client.from('milestones').insert(
      initialGoal.milestones.map(({ label, complete }, index) => ({ goal_id: created.id, label, position: index, is_complete: complete })),
    ).select()
    if (milestoneError) throw milestoneError
    goalRow = { ...created, milestones }
  }

  let health = healthResult.data
  if (!health) {
    const { data: createdHealth, error: healthError } = await client.from('health_entries').insert({
      user_id: userId, entry_date: entryDate, ...defaultHealth,
    }).select().single()
    if (healthError) throw healthError
    health = createdHealth
  }
  const serverSignal = signalResult.data?.[0]
  return {
    selectedMood: moodResult.data?.mood || moods[1].id,
    highlights: highlightsResult.data?.map(mapHighlight) || [],
    metrics: mapHealth(health),
    goal: mapGoal(goalRow),
    signal: serverSignal ? {
      percentage: serverSignal.status === 'available' ? serverSignal.percentage : null,
      affirmation: getComfortSignal('drained').affirmation,
      label: feelings[0].label,
      totalCount: serverSignal.total_count,
      status: serverSignal.status,
    } : getComfortSignal('drained'),
    selectedFeeling: 'drained',
    entryDate,
  }
}

export async function saveMood(userId, mood, timezone) {
  const { error } = await requireClient().from('mood_entries').upsert(
    { user_id: userId, entry_date: localDate(timezone), mood },
    { onConflict: 'user_id,entry_date' },
  )
  if (error) throw error
}

export async function saveFeeling(userId, feeling) {
  const client = requireClient()
  const { error: insertError } = await client.from('feeling_checkins').insert({ user_id: userId, feeling })
  if (insertError) throw insertError
  const { data, error } = await client.rpc('get_comfort_signal', { p_feeling: feeling })
  if (error) throw error
  return data?.[0]
}

export async function createHighlight(userId, content) {
  const client = requireClient()
  const { data, error } = await client.from('highlights').insert({ user_id: userId, content }).select().single()
  if (error) throw error
  const saved = mapHighlight(data)
  try {
    const { data: compliment } = await client.functions.invoke('generate-compliment', { body: { highlight_id: data.id } })
    if (compliment?.compliment) return { ...saved, compliment: compliment.compliment, complimentStatus: compliment.status || 'complete' }
  } catch { /* store the same safe fallback when the local function is unavailable */ }
  const fallback = fallbackCompliment(content)
  await client.from('highlights').update({ compliment: fallback, compliment_status: 'fallback' })
    .eq('id', data.id).eq('user_id', userId)
  return { ...saved, compliment: fallback, complimentStatus: 'fallback' }
}

export async function saveHealth(userId, metrics, timezone) {
  const values = Object.fromEntries(metrics.map(({ id, value }) => [id, value]))
  const { error } = await requireClient().from('health_entries').upsert({
    user_id: userId,
    entry_date: localDate(timezone),
    hydration_glasses: values.water,
    nourishing_meals: values.meals,
    sleep_minutes: Math.round(values.sleep * 60),
    movement_minutes: values.movement,
  }, { onConflict: 'user_id,entry_date' })
  if (error) throw error
}

export async function saveMilestone(milestoneId, complete) {
  const { error } = await requireClient().from('milestones').update({
    is_complete: complete, completed_at: complete ? new Date().toISOString() : null,
  }).eq('id', milestoneId)
  if (error) throw error
}
