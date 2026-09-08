import { feelings, healthMetrics, moods } from '../data/demoData.js'
import { localDate } from '../features/dashboard/date.js'
import { getComfortSignal } from './dashboard.js'
import { supabase } from './supabase/client.js'

const defaultHealth = { hydration_glasses: 0, nourishing_meals: 0, sleep_minutes: 0, movement_minutes: 0 }

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

function recentDates(entryDate, count = 7) {
  const today = new Date(`${entryDate}T12:00:00.000Z`)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - (count - index - 1))
    return date.toISOString().slice(0, 10)
  })
}

function mapDailyMinutes(rows, dates) {
  const minutesByDate = new Map(rows.map(({ entry_date, minutes }) => [entry_date, minutes]))
  return dates.map((date) => minutesByDate.get(date) || 0)
}

function mapSupportingSummaries(entryDate, taskRows, studyRows, workoutRows, sleepRows) {
  const dates = recentDates(entryDate)
  const workoutDays = mapDailyMinutes(workoutRows, dates)
  const sleepDays = mapDailyMinutes(sleepRows, dates)
  const totalSleep = sleepRows.reduce((total, { minutes }) => total + minutes, 0)

  return {
    tasks: taskRows.length ? {
      complete: taskRows.filter(({ is_complete }) => is_complete).length,
      total: taskRows.length,
    } : null,
    study: studyRows[0] ? { topic: studyRows[0].topic, entryDate: studyRows[0].entry_date } : null,
    workout: workoutRows.length ? { days: workoutDays, todayMinutes: workoutDays.at(-1) } : null,
    sleep: sleepRows.length ? {
      averageMinutes: Math.round(totalSleep / sleepRows.length),
      days: sleepDays,
      todayMinutes: sleepDays.at(-1),
    } : null,
  }
}

export async function loadDashboard(userId, timezone = 'UTC') {
  const client = requireClient()
  const entryDate = localDate(timezone)
  const summaryStartDate = recentDates(entryDate)[0]
  const [moodResult, highlightsResult, healthResult, goalsResult, feelingResult, signalResult, tasksResult, studyResult, workoutResult, sleepResult] = await Promise.all([
    client.from('mood_entries').select('mood').eq('user_id', userId).eq('entry_date', entryDate).maybeSingle(),
    client.from('highlights').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    client.from('health_entries').select('*').eq('user_id', userId).eq('entry_date', entryDate).maybeSingle(),
    client.from('goals').select('*, milestones(*)').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: true }).limit(1),
    client.from('feeling_checkins').select('feeling').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    client.rpc('get_comfort_signal', { p_feeling: 'drained' }),
    client.from('tasks').select('is_complete').eq('user_id', userId),
    client.from('study_logs').select('topic, entry_date').eq('user_id', userId).eq('entry_date', entryDate).order('created_at', { ascending: false }).limit(1),
    client.from('workout_entries').select('entry_date, minutes').eq('user_id', userId).gte('entry_date', summaryStartDate).lte('entry_date', entryDate),
    client.from('sleep_entries').select('entry_date, minutes').eq('user_id', userId).gte('entry_date', summaryStartDate).lte('entry_date', entryDate),
  ])
  const failed = [moodResult, highlightsResult, healthResult, goalsResult, feelingResult, signalResult, tasksResult, studyResult, workoutResult, sleepResult].find(({ error }) => error)
  if (failed) throw failed.error

  let health = healthResult.data
  const selectedFeeling = feelingResult.data?.feeling || feelings[0].id
  let serverSignal = signalResult.data?.[0]
  if (selectedFeeling !== 'drained') {
    const selectedSignalResult = await client.rpc('get_comfort_signal', { p_feeling: selectedFeeling })
    if (selectedSignalResult.error) throw selectedSignalResult.error
    serverSignal = selectedSignalResult.data?.[0]
  }
  return {
    selectedMood: moodResult.data?.mood || moods[1].id,
    highlights: highlightsResult.data?.map(mapHighlight) || [],
    metrics: mapHealth(health),
    goal: goalsResult.data?.[0] ? mapGoal(goalsResult.data[0]) : null,
    signal: serverSignal ? {
      percentage: serverSignal.status === 'available' ? serverSignal.percentage : null,
      affirmation: getComfortSignal(selectedFeeling).affirmation,
      label: feelings.find(({ id }) => id === selectedFeeling)?.label || feelings[0].label,
      totalCount: serverSignal.total_count,
      status: serverSignal.status,
    } : getComfortSignal(selectedFeeling),
    selectedFeeling,
    entryDate,
    supporting: mapSupportingSummaries(
      entryDate,
      tasksResult.data || [],
      studyResult.data || [],
      workoutResult.data || [],
      sleepResult.data || [],
    ),
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
  // The check-in is already durable. A privacy-safe signal is optional, so a
  // transient aggregate failure must not make the UI retry the insert.
  if (error) return null
  return data?.[0] || null
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
  const { data: claimed, error: claimError } = await client.rpc('claim_compliment_generation', { p_highlight_id: data.id })
  if (claimError) throw claimError
  if (!claimed) return saved
  const { data: finalized, error: fallbackError } = await client.rpc('finalize_compliment_generation', {
    p_highlight_id: data.id,
    p_compliment: fallback,
    p_status: 'fallback',
  })
  if (fallbackError || finalized === false) throw fallbackError || new Error('Could not save fallback compliment')
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
  }).eq('id', milestoneId).select('id').single()
  if (error) throw error
}
