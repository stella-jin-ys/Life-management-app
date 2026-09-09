import { afterEach, describe, expect, test, vi } from 'vitest'

const supabaseState = vi.hoisted(() => ({ client: null }))

vi.mock('./supabase/client.js', () => ({
  get supabase() {
    return supabaseState.client
  },
}))

import {
  createGoal,
  createMilestone,
  createMeal,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  loadDashboard,
  listGoals,
  listMeals,
  saveFeeling,
  saveHealth,
  saveMilestone,
  saveMood,
  updateGoalStatus,
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
      delete() {
        request.action = 'delete'
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
  test('lists and creates user-scoped meals', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'meal_entries:select': { data: [{ id: 'meal-1', food: 'Rice bowl' }], error: null },
        'meal_entries:insert': { data: { id: 'meal-2', food: 'Yogurt' }, error: null },
      },
    })

    await listMeals('user-1', '2026-01-01')
    await createMeal('user-1', {
      entryDate: '2026-01-01', mealType: 'breakfast', food: ' Yogurt ',
      hasProduce: true, hasProtein: true, hasCarbohydrate: false, hasHealthyFat: false,
    })

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'meal_entries', action: 'select', filters: [['user_id', 'user-1'], ['entry_date', '2026-01-01']] }),
      expect.objectContaining({
        table: 'meal_entries',
        action: 'insert',
        payload: expect.objectContaining({ user_id: 'user-1', entry_date: '2026-01-01', meal_type: 'breakfast', food: 'Yogurt', has_produce: true }),
      }),
    ]))
  })

  test('lists and creates goals with user-scoped payloads', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'goals:insert': { data: { id: 'goal-1', title: 'Learn gently', why: 'Make room for curiosity', milestones: [] }, error: null },
        'milestones:insert': { data: { id: 'milestone-1', goal_id: 'goal-1', label: 'Read one page', position: 0 }, error: null },
        'goals:update': { data: { id: 'goal-1', title: 'Learn gently', why: 'Make room for curiosity', status: 'completed', milestones: [] }, error: null },
      },
    })

    await listGoals('user-1')
    await createGoal('user-1', '  Learn gently ', 'Make room for curiosity')
    await createMilestone('goal-1', 'Read one page', 0)
    await saveMilestone('goal-1', true)
    await updateGoalStatus('goal-1', 'completed')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'goals', action: 'select', filters: [['user_id', 'user-1']] }),
      expect.objectContaining({ table: 'goals', action: 'insert', payload: { user_id: 'user-1', title: 'Learn gently', why: 'Make room for curiosity' } }),
      expect.objectContaining({ table: 'milestones', action: 'insert', payload: { goal_id: 'goal-1', label: 'Read one page', position: 0 } }),
      expect.objectContaining({ table: 'milestones', action: 'update', filters: [['id', 'goal-1']] }),
      expect.objectContaining({ table: 'goals', action: 'update', filters: [['id', 'goal-1']], payload: { status: 'completed' } }),
    ]))
  })

  test('limits dashboard highlights and maps task rows and meal feedback inputs', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'mood_entries:select': { data: null, error: null },
        'highlights:select': { data: [5, 4, 3, 2, 1].map((id) => ({ id: `highlight-${id}`, content: `Win ${id}`, created_at: `2026-01-0${id}T09:00:00.000Z` })), error: null },
        'health_entries:select': { data: null, error: null },
        'goals:select': { data: [], error: null },
        'meal_entries:select': { data: [{ food: 'Rice bowl', has_produce: true, has_protein: true, has_carbohydrate: false, has_healthy_fat: false }], error: null },
        'tasks:select': { data: [{ id: 'task-1', title: 'Read', is_complete: false }], error: null },
        rpc: { data: [{ status: 'insufficient_data', percentage: null, total_count: null }], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'UTC')

    expect(dashboard.highlights).toHaveLength(4)
    expect(dashboard.highlights[0].entry).toBe('Win 5')
    expect(dashboard.meals[0].food).toBe('Rice bowl')
    expect(dashboard.mealFeedback.missing).toContain('healthy fat')
    expect(dashboard.supporting.tasks.rows).toEqual([{ id: 'task-1', title: 'Read', isComplete: false }])
  })

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
    expect(dashboard.signal.status).toBe('estimated')
    expect(dashboard.signal.percentage).toBeGreaterThanOrEqual(42)
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
        'tasks:select': { data: [{ id: 'task-1', title: 'Read', due_date: '2026-01-01', is_complete: true }, { id: 'task-2', title: 'Walk', due_date: null, is_complete: false }], error: null },
        'study_logs:select': { data: [{ topic: 'UI design', entry_date: '2026-01-01' }], error: null },
        'workout_entries:select': { data: [{ entry_date: '2026-01-01', minutes: 30 }], error: null },
        'sleep_entries:select': { data: [{ entry_date: '2026-01-01', minutes: 440 }], error: null },
        rpc: { data: [{ status: 'insufficient_data', percentage: null, total_count: null }], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'UTC')

    expect(dashboard.supporting).toEqual({
      tasks: { complete: 1, total: 2, rows: [
        { id: 'task-1', title: 'Read', dueDate: '2026-01-01', isComplete: true },
        { id: 'task-2', title: 'Walk', dueDate: null, isComplete: false },
      ] },
      study: { topic: 'UI design', entryDate: '2026-01-01' },
      workout: { days: [0, 0, 0, 0, 0, 0, 30], todayMinutes: 30 },
      sleep: { averageMinutes: 440, days: [0, 0, 0, 0, 0, 0, 440], todayMinutes: 440 },
    })
    for (const request of supabaseState.client.requests.filter(({ table }) =>
      ['tasks', 'study_logs', 'workout_entries', 'sleep_entries'].includes(table))) {
      expect(request.filters).toContainEqual(['user_id', 'user-1'])
    }
  })

  test('keeps an empty authenticated account free of fictional starter rows', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'mood_entries:select': { data: null, error: null },
        'highlights:select': { data: [], error: null },
        'health_entries:select': { data: null, error: null },
        'goals:select': { data: [], error: null },
        rpc: { data: [], error: null },
      },
    })

    const dashboard = await loadDashboard('user-1', 'UTC')

    expect(dashboard.goal).toBeNull()
    expect(dashboard.metrics.find(({ id }) => id === 'water')).toMatchObject({ value: 0 })
    expect(supabaseState.client.requests.some(({ action }) => action === 'insert')).toBe(false)
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
        rpc: { data: true, error: null },
      },
    })
    supabaseState.client.functions.invoke.mockResolvedValue({ data: null })

    await saveFeeling('user-1', 'lonely')
    const highlight = await createHighlight('user-1', 'Called a friend')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'feeling_checkins', action: 'insert', payload: { user_id: 'user-1', feeling: 'lonely' } }),
      expect.objectContaining({ table: 'highlights', action: 'insert', payload: { user_id: 'user-1', content: 'Called a friend' } }),
    ]))
    expect(supabaseState.client.rpc).toHaveBeenCalledWith('claim_compliment_generation', { p_highlight_id: 'highlight-1' })
    expect(supabaseState.client.rpc).toHaveBeenCalledWith('finalize_compliment_generation', expect.objectContaining({
      p_highlight_id: 'highlight-1', p_status: 'fallback',
    }))
    expect(highlight).toMatchObject({
      compliment: '“Called a friend” counts. You noticed what helped, and that kind of attention builds a life you can feel.',
      complimentStatus: 'fallback',
    })
  })

  test('scopes highlight edits and deletes to the authenticated user', async () => {
    supabaseState.client = createFakeClient({
      responses: {
        'highlights:update': { data: { id: 'highlight-1', content: 'Edited win', created_at: '2026-01-01T09:00:00.000Z' }, error: null },
        'highlights:delete': { data: null, error: null },
      },
    })

    await updateHighlight('user-1', 'highlight-1', 'Edited win')
    await deleteHighlight('user-1', 'highlight-1')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: 'highlights',
        action: 'update',
        filters: [['id', 'highlight-1'], ['user_id', 'user-1']],
        payload: { content: 'Edited win' },
      }),
      expect.objectContaining({
        table: 'highlights',
        action: 'delete',
        filters: [['id', 'highlight-1'], ['user_id', 'user-1']],
      }),
    ]))
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
