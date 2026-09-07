import { afterEach, describe, expect, test, vi } from 'vitest'

const supabaseState = vi.hoisted(() => ({ client: null }))

vi.mock('./supabase/client.js', () => ({
  get supabase() {
    return supabaseState.client
  },
}))

import {
  createHighlight,
  loadDashboard,
  saveFeeling,
  saveHealth,
  saveMilestone,
  saveMood,
} from './lifeApi.js'
import { localDate } from '../features/dashboard/date.js'

function createFakeClient({ responses = {}, functionResponse = {} } = {}) {
  const requests = []

  function resultFor(request) {
    const result = responses[`${request.table}:${request.action}`]
    return typeof result === 'function' ? result(request) : result || { data: null, error: null }
  }

  function createQuery(table) {
    const request = { table, action: 'select', filters: [], payload: undefined, options: undefined }
    const query = {
      select(columns) {
        request.selected = columns
        if (request.action === 'select') request.action = 'select'
        return query
      },
      eq(column, value) {
        request.filters.push([column, value])
        return query
      },
      gte(column, value) {
        request.filters.push([column, value])
        return query
      },
      lte(column, value) {
        request.filters.push([column, value])
        return query
      },
      order() { return query },
      limit() { return query },
      insert(payload) {
        request.action = 'insert'
        request.payload = payload
        return query
      },
      upsert(payload, options) {
        request.action = 'upsert'
        request.payload = payload
        request.options = options
        return query
      },
      update(payload) {
        request.action = 'update'
        request.payload = payload
        return query
      },
      maybeSingle() {
        requests.push(request)
        return Promise.resolve(resultFor(request))
      },
      single() {
        requests.push(request)
        return Promise.resolve(resultFor(request))
      },
      then(resolve, reject) {
        requests.push(request)
        return Promise.resolve(resultFor(request)).then(resolve, reject)
      },
    }
    return query
  }

  return {
    requests,
    from: vi.fn((table) => createQuery(table)),
    rpc: vi.fn(() => Promise.resolve(responses.rpc || { data: [], error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: functionResponse })) },
  }
}

afterEach(() => {
  supabaseState.client = null
  vi.useRealTimers()
})

describe('localDate', () => {
  test('uses the profile IANA timezone when deriving a local day', () => {
    const instant = new Date('2026-01-01T00:30:00.000Z')

    expect(localDate('America/Los_Angeles', instant)).toBe('2025-12-31')
  })
})

describe('dashboard persistence', () => {
  test('loads core rows with the authenticated user and the profile local date', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:30:00.000Z'))
    supabaseState.client = createFakeClient({
      responses: {
        'mood_entries:select': { data: { mood: 'bright' }, error: null },
        'highlights:select': { data: [], error: null },
        'health_entries:select': {
          data: { hydration_glasses: 4, nourishing_meals: 2, sleep_minutes: 420, movement_minutes: 30 },
          error: null,
        },
        'goals:select': { data: [{ id: 'goal-1', title: 'Keep going', why: 'Because it matters', milestones: [] }], error: null },
        rpc: { data: [{ status: 'insufficient_data', percentage: null, total_count: null }], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'America/Los_Angeles')

    expect(dashboard.entryDate).toBe('2025-12-31')
    expect(dashboard.signal.percentage).toBeNull()
    for (const request of supabaseState.client.requests.filter(({ table }) =>
      ['mood_entries', 'highlights', 'health_entries', 'goals'].includes(table))) {
      expect(request.filters).toContainEqual(['user_id', 'user-1'])
    }
    for (const request of supabaseState.client.requests.filter(({ table }) =>
      ['mood_entries', 'health_entries'].includes(table))) {
      expect(request.filters).toContainEqual(['entry_date', '2025-12-31'])
    }
  })

  test('loads private supporting summaries for the dashboard', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))
    supabaseState.client = createFakeClient({
      responses: {
        'mood_entries:select': { data: { mood: 'steady' }, error: null },
        'highlights:select': { data: [], error: null },
        'health_entries:select': { data: { hydration_glasses: 5, nourishing_meals: 2, sleep_minutes: 420, movement_minutes: 20 }, error: null },
        'goals:select': { data: [{ id: 'goal-1', title: 'Keep going', why: 'Because it matters', milestones: [] }], error: null },
        'tasks:select': { data: [{ is_complete: true }, { is_complete: false }], error: null },
        'study_logs:select': { data: [{ topic: 'UI design', entry_date: '2026-01-01' }], error: null },
        'workout_entries:select': { data: [{ entry_date: '2026-01-01', minutes: 30 }], error: null },
        'sleep_entries:select': { data: [{ entry_date: '2026-01-01', minutes: 440 }], error: null },
        rpc: { data: [{ status: 'insufficient_data', percentage: null, total_count: null }], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'UTC')

    expect(dashboard.supporting).toEqual({
      tasks: { complete: 1, total: 2 },
      study: { topic: 'UI design', entryDate: '2026-01-01' },
      workout: { days: [0, 0, 0, 0, 0, 0, 30], todayMinutes: 30 },
      sleep: { averageMinutes: 440, days: [0, 0, 0, 0, 0, 0, 440], todayMinutes: 440 },
    })
    for (const request of supabaseState.client.requests.filter(({ table }) =>
      ['tasks', 'study_logs', 'workout_entries', 'sleep_entries'].includes(table))) {
      expect(request.filters).toContainEqual(['user_id', 'user-1'])
    }
  })

  test('initializes goal and health rows for an empty authenticated account', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'mood_entries:select': { data: null, error: null },
        'highlights:select': { data: [], error: null },
        'health_entries:select': { data: null, error: null },
        'goals:select': { data: [], error: null },
        'goals:insert': { data: { id: 'goal-1', title: 'A little more of what matters', why: 'Small actions that keep your priorities close.' }, error: null },
        'milestones:insert': { data: [{ id: 'milestone-1', label: 'Read 12 books', position: 0, is_complete: true }], error: null },
        'health_entries:insert': {
          data: { hydration_glasses: 5, nourishing_meals: 2, sleep_minutes: 432, movement_minutes: 24 }, error: null,
        },
        rpc: { data: [], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'UTC')

    expect(dashboard.goal).toMatchObject({ id: 'goal-1', milestones: [{ id: 'milestone-1', complete: true }] })
    expect(dashboard.metrics.find(({ id }) => id === 'water')).toMatchObject({ value: 5 })
    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'goals', action: 'insert', payload: expect.objectContaining({ user_id: 'user-1' }) }),
      expect.objectContaining({ table: 'health_entries', action: 'insert', payload: expect.objectContaining({ user_id: 'user-1' }) }),
    ]))
  })

  test('includes the authenticated user and local date in daily saves', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:30:00.000Z'))
    supabaseState.client = createFakeClient()

    await saveMood('user-1', 'steady', 'America/Los_Angeles')
    await saveHealth('user-1', [
      { id: 'water', value: 6 },
      { id: 'meals', value: 3 },
      { id: 'sleep', value: 7.5 },
      { id: 'movement', value: 40 },
    ], 'America/Los_Angeles')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'mood_entries',
        action: 'upsert',
        payload: expect.objectContaining({ user_id: 'user-1', entry_date: '2025-12-31', mood: 'steady' }),
      }),
      expect.objectContaining({
        table: 'health_entries',
        action: 'upsert',
        payload: expect.objectContaining({ user_id: 'user-1', entry_date: '2025-12-31' }),
      }),
    ]))
  })

  test('scopes non-daily saves and fallback compliment writes to the authenticated user', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'highlights:insert': {
          data: { id: 'highlight-1', content: 'Called a friend', created_at: '2026-01-01T09:00:00.000Z' },
          error: null,
        },
      },
    })
    supabaseState.client.functions.invoke.mockResolvedValue({ data: null })

    await saveFeeling('user-1', 'lonely')
    const highlight = await createHighlight('user-1', 'Called a friend')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'feeling_checkins', action: 'insert', payload: { user_id: 'user-1', feeling: 'lonely' } }),
      expect.objectContaining({ table: 'highlights', action: 'insert', payload: { user_id: 'user-1', content: 'Called a friend' } }),
      expect.objectContaining({ table: 'highlights', action: 'update', filters: expect.arrayContaining([['user_id', 'user-1']]) }),
    ]))
    expect(highlight).toMatchObject({
      compliment: '“Called a friend” counts. You noticed what helped, and that kind of attention builds a life you can feel.',
      complimentStatus: 'fallback',
    })
  })

  test('confirms a milestone update is scoped to its requested record', async () => {
    supabaseState.client = createFakeClient()

    await saveMilestone('milestone-1', true)

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'milestones',
        action: 'update',
        selected: 'id',
        filters: [['id', 'milestone-1']],
        payload: expect.objectContaining({ is_complete: true }),
      }),
    ]))
  })
})
