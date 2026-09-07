import { localDate } from '../dashboard/date.js'
import { supabase } from '../../lib/supabase/client.js'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

function requireClient() {
  if (!supabase) throw new Error('Supabase browser configuration is missing')
  return supabase
}

function text(value, maximum, message) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized || normalized.length > maximum) throw new Error(message)
  return normalized
}

function optionalText(value, maximum, message) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (normalized.length > maximum) throw new Error(message)
  return normalized
}

function minutes(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0 || number > 1440) {
    throw new Error('Enter whole minutes between 0 and 1,440.')
  }
  return number
}

function amountCents(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < -100000000 || number > 100000000) {
    throw new Error('Enter a valid amount.')
  }
  return number
}

function date(value, message = 'Choose a valid date.') {
  const parsed = new Date(`${value}T12:00:00.000Z`)
  if (typeof value !== 'string' || !datePattern.test(value) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(message)
  return value
}

function moneyToCents(value) {
  if (typeof value === 'number') return amountCents(Math.round(value * 100))
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error('Enter a valid amount.')
  }
  return amountCents(Math.round(Number(value) * 100))
}

function resultData(result) {
  if (result.error) throw result.error
  return result.data
}

export function validateModuleValues(module, values) {
  switch (module) {
    case 'tasks':
      return { title: text(values.title, 240, 'Please add a task title.'), dueDate: values.dueDate ? date(values.dueDate) : null }
    case 'study':
      return {
        topic: text(values.topic, 240, 'Please add a study topic.'),
        notes: optionalText(values.notes, 2000, 'Study notes can be at most 2,000 characters.'),
      }
    case 'workout':
      return { activity: text(values.activity, 120, 'Please add a workout activity.'), minutes: minutes(values.minutes) }
    case 'sleeping':
      return { minutes: minutes(values.minutes) }
    case 'diary':
      return { content: text(values.content, 5000, 'Please add a diary entry.') }
    case 'finance':
      return {
        label: text(values.label, 160, 'Please add a finance label.'),
        amountCents: moneyToCents(values.amount),
      }
    default:
      throw new Error('Choose a valid module.')
  }
}

export async function listTasks(userId) {
  return resultData(await requireClient().from('tasks').select('*').eq('user_id', userId)
    .order('is_complete', { ascending: true }).order('due_date', { ascending: true })) || []
}

export async function createTask(userId, title, dueDate) {
  const values = validateModuleValues('tasks', { title, dueDate })
  return resultData(await requireClient().from('tasks').insert({
    user_id: userId, title: values.title, due_date: values.dueDate,
  }).select().single())
}

export async function toggleTask(id, complete) {
  return resultData(await requireClient().from('tasks').update({ is_complete: Boolean(complete) })
    .eq('id', id).select().single())
}

export async function deleteTask(id) {
  const { error } = await requireClient().from('tasks').delete().eq('id', id)
  if (error) throw error
}

export async function listStudyLogs(userId, timezone) {
  return resultData(await requireClient().from('study_logs').select('*').eq('user_id', userId)
    .eq('entry_date', localDate(timezone)).order('created_at', { ascending: false })) || []
}

export async function createStudyLog(userId, topic, notes, timezone) {
  const values = validateModuleValues('study', { topic, notes })
  return resultData(await requireClient().from('study_logs').insert({
    user_id: userId, entry_date: localDate(timezone), topic: values.topic, notes: values.notes,
  }).select().single())
}

export async function listWorkoutEntries(userId, startDate, endDate) {
  return resultData(await requireClient().from('workout_entries').select('*').eq('user_id', userId)
    .gte('entry_date', date(startDate)).lte('entry_date', date(endDate)).order('entry_date', { ascending: true })) || []
}

export async function upsertWorkoutEntry(userId, entryDate, activity, entryMinutes) {
  const values = validateModuleValues('workout', { activity, minutes: entryMinutes })
  return resultData(await requireClient().from('workout_entries').upsert({
    user_id: userId, entry_date: date(entryDate), activity: values.activity, minutes: values.minutes,
  }, { onConflict: 'user_id,entry_date' }).select().single())
}

export async function listSleepEntries(userId, startDate, endDate) {
  return resultData(await requireClient().from('sleep_entries').select('*').eq('user_id', userId)
    .gte('entry_date', date(startDate)).lte('entry_date', date(endDate)).order('entry_date', { ascending: true })) || []
}

export async function upsertSleepEntry(userId, entryDate, entryMinutes) {
  const values = validateModuleValues('sleeping', { minutes: entryMinutes })
  return resultData(await requireClient().from('sleep_entries').upsert({
    user_id: userId, entry_date: date(entryDate), minutes: values.minutes,
  }, { onConflict: 'user_id,entry_date' }).select().single())
}

export async function getDiaryEntry(userId, entryDate, timezone) {
  return resultData(await requireClient().from('diary_entries').select('*').eq('user_id', userId)
    .eq('entry_date', entryDate ? date(entryDate) : localDate(timezone)).maybeSingle())
}

export async function upsertDiaryEntry(userId, entryDate, content, timezone) {
  const values = validateModuleValues('diary', { content })
  return resultData(await requireClient().from('diary_entries').upsert({
    user_id: userId, entry_date: entryDate ? date(entryDate) : localDate(timezone), content: values.content,
  }, { onConflict: 'user_id,entry_date' }).select().single())
}

export async function listFinanceEntries(userId, startDate, endDate) {
  return resultData(await requireClient().from('finance_entries').select('*').eq('user_id', userId)
    .gte('entry_date', date(startDate)).lte('entry_date', date(endDate)).order('entry_date', { ascending: false })) || []
}

export async function createFinanceEntry(userId, entryDate, label, entryAmountCents) {
  const normalizedLabel = text(label, 160, 'Please add a finance label.')
  return resultData(await requireClient().from('finance_entries').insert({
    user_id: userId, entry_date: date(entryDate), label: normalizedLabel, amount_cents: amountCents(entryAmountCents),
  }).select().single())
}
