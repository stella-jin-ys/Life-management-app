import { afterEach, describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const supabaseState = vi.hoisted(() => ({ client: null }))

vi.mock('../../lib/supabase/client.js', () => ({
  get supabase() {
    return supabaseState.client
  },
}))

import {
  createFinanceEntry,
  createStudyLog,
  createTask,
  deleteTask,
  getDiaryEntry,
  listFinanceEntries,
  listSleepEntries,
  listStudyLogs,
  listTasks,
  listWorkoutEntries,
  toggleTask,
  upsertDiaryEntry,
  upsertSleepEntry,
  upsertWorkoutEntry,
  validateModuleValues,
} from './moduleApi.js'
import useModuleData from './useModuleData.js'
import ModulePage from './ModulePage.jsx'
import DemoRoutes from './DemoRoutes.jsx'

function createFakeClient() {
  const requests = []

  function query(table) {
    const request = { table, action: 'select', filters: [], payload: undefined, options: undefined }
    const chain = {
      select(columns) { request.selected = columns; return chain },
      eq(column, value) { request.filters.push([column, value]); return chain },
      gte(column, value) { request.filters.push([column, value]); return chain },
      lte(column, value) { request.filters.push([column, value]); return chain },
      order() { return chain },
      insert(payload) { request.action = 'insert'; request.payload = payload; return chain },
      upsert(payload, options) { request.action = 'upsert'; request.payload = payload; request.options = options; return chain },
      update(payload) { request.action = 'update'; request.payload = payload; return chain },
      delete() { request.action = 'delete'; return chain },
      single() { requests.push(request); return Promise.resolve({ data: { id: 'saved-entry', ...request.payload }, error: null }) },
      maybeSingle() { requests.push(request); return Promise.resolve({ data: null, error: null }) },
      then(resolve, reject) { requests.push(request); return Promise.resolve({ data: [], error: null }).then(resolve, reject) },
    }
    return chain
  }

  return { requests, from: vi.fn((table) => query(table)) }
}

afterEach(() => {
  supabaseState.client = null
})

describe('supporting module validation', () => {
  test.each([
    ['tasks', { title: '   ' }, 'Please add a task title.'],
    ['study', { topic: '   ', notes: '' }, 'Please add a study topic.'],
    ['diary', { content: '   ' }, 'Please add a diary entry.'],
    ['finance', { label: 'Groceries', amount: 'not-money' }, 'Enter a valid amount.'],
    ['workout', { activity: 'Walk', minutes: '12.5' }, 'Enter whole minutes between 0 and 1,440.'],
    ['sleeping', { minutes: '1441' }, 'Enter whole minutes between 0 and 1,440.'],
  ])('rejects invalid %s form values before persistence', (module, values, message) => {
    expect(() => validateModuleValues(module, values)).toThrow(message)
  })

  test('normalizes valid form values to the database request shape', () => {
    expect(validateModuleValues('finance', { label: '  Groceries ', amount: '-12.34' })).toEqual({
      label: 'Groceries', amountCents: -1234,
    })
    expect(validateModuleValues('workout', { activity: ' Evening walk ', minutes: '45' })).toEqual({
      activity: 'Evening walk', minutes: 45,
    })
  })
})

describe('supporting module persistence', () => {
  test('writes trimmed user- and local-date-scoped module requests', async () => {
    supabaseState.client = createFakeClient()

    await createTask('user-1', '  Call Mum  ', '2026-09-07')
    await createStudyLog('user-1', '  Physics ', 'Notes', 'Europe/Stockholm')
    await upsertWorkoutEntry('user-1', '2026-09-07', ' Walk ', 45)
    await createFinanceEntry('user-1', '2026-09-07', ' Lunch ', -1250)

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'tasks', action: 'insert', payload: { user_id: 'user-1', title: 'Call Mum', due_date: '2026-09-07' } }),
      expect.objectContaining({ table: 'study_logs', action: 'insert', payload: { user_id: 'user-1', topic: 'Physics', notes: 'Notes', entry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } }),
      expect.objectContaining({ table: 'workout_entries', action: 'upsert', payload: { user_id: 'user-1', entry_date: '2026-09-07', activity: 'Walk', minutes: 45 }, options: { onConflict: 'user_id,entry_date' } }),
      expect.objectContaining({ table: 'finance_entries', action: 'insert', payload: { user_id: 'user-1', entry_date: '2026-09-07', label: 'Lunch', amount_cents: -1250 } }),
    ]))
  })

  test('scopes date-range reads to the requested user and dates', async () => {
    supabaseState.client = createFakeClient()

    await listSleepEntries('user-1', '2026-09-01', '2026-09-07')

    expect(supabaseState.client.requests).toContainEqual(expect.objectContaining({
      table: 'sleep_entries',
      filters: [['user_id', 'user-1'], ['entry_date', '2026-09-01'], ['entry_date', '2026-09-07']],
    }))
  })

  test('covers task mutations, daily upserts, and every remaining user-scoped list', async () => {
    supabaseState.client = createFakeClient()

    await listTasks('user-1')
    await toggleTask('task-1', true)
    await deleteTask('task-1')
    await listStudyLogs('user-1', 'UTC')
    await listWorkoutEntries('user-1', '2026-09-01', '2026-09-07')
    await upsertSleepEntry('user-1', '2026-09-07', 480)
    await getDiaryEntry('user-1', '2026-09-07', 'UTC')
    await upsertDiaryEntry('user-1', '2026-09-07', 'A quiet day.', 'UTC')
    await listFinanceEntries('user-1', '2026-09-01', '2026-09-07')

    expect(supabaseState.client.requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: 'tasks', action: 'select', filters: [['user_id', 'user-1']] }),
      expect.objectContaining({ table: 'tasks', action: 'update', payload: { is_complete: true }, filters: [['id', 'task-1']] }),
      expect.objectContaining({ table: 'tasks', action: 'delete', filters: [['id', 'task-1']] }),
      expect.objectContaining({ table: 'study_logs', action: 'select', filters: expect.arrayContaining([['user_id', 'user-1']]) }),
      expect.objectContaining({ table: 'workout_entries', action: 'select', filters: [['user_id', 'user-1'], ['entry_date', '2026-09-01'], ['entry_date', '2026-09-07']] }),
      expect.objectContaining({ table: 'sleep_entries', action: 'upsert', payload: { user_id: 'user-1', entry_date: '2026-09-07', minutes: 480 }, options: { onConflict: 'user_id,entry_date' } }),
      expect.objectContaining({ table: 'diary_entries', action: 'select', filters: [['user_id', 'user-1'], ['entry_date', '2026-09-07']] }),
      expect.objectContaining({ table: 'diary_entries', action: 'upsert', payload: { user_id: 'user-1', entry_date: '2026-09-07', content: 'A quiet day.' }, options: { onConflict: 'user_id,entry_date' } }),
      expect.objectContaining({ table: 'finance_entries', action: 'select', filters: [['user_id', 'user-1'], ['entry_date', '2026-09-01'], ['entry_date', '2026-09-07']] }),
    ]))
  })
})

describe('supporting module state', () => {
  test('keeps the last saved data when a task save is rejected', async () => {
    const client = createFakeClient()
    const originalFrom = client.from
    client.from = vi.fn((table) => {
      const chain = originalFrom(table)
      if (table !== 'tasks') return chain
      const originalSingle = chain.single
      chain.single = () => Promise.resolve({ data: null, error: new Error('offline') })
      return chain
    })
    supabaseState.client = client
    const { result } = renderHook(() => useModuleData('tasks', { id: 'user-1' }, 'UTC'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    let saved
    await act(async () => { saved = await result.current.create({ title: 'Call Mum', dueDate: '2026-09-07' }) })

    expect(saved).toBe(false)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBe('We could not save this entry. Please try again.')
  })
})

describe('supporting module forms', () => {
  test('keeps an invalid finance form filled in for correction', () => {
    render(<ModulePage module="finance" profile={{ timezone: 'UTC' }} />)

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Lunch' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: 'twelve' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save finance entry' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid amount.')
    expect(screen.getByLabelText('Label')).toHaveValue('Lunch')
    expect(screen.getByLabelText('Amount')).toHaveValue('twelve')
  })

  test('keeps typed finance fields after a rejected persistence request', async () => {
    const client = createFakeClient()
    const originalFrom = client.from
    client.from = vi.fn((table) => {
      const chain = originalFrom(table)
      if (table === 'finance_entries') chain.single = () => Promise.resolve({ data: null, error: new Error('offline') })
      return chain
    })
    supabaseState.client = client
    render(<ModulePage module="finance" user={{ id: 'user-1' }} profile={{ timezone: 'UTC' }} />)

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Lunch' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '12.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save finance entry' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save this entry. Please try again.')
    expect(screen.getByLabelText('Label')).toHaveValue('Lunch')
    expect(screen.getByLabelText('Amount')).toHaveValue('12.50')
  })
})

describe('demo module routes', () => {
  test('renders a local-only Tasks page at the demo module route', async () => {
    render(<MemoryRouter initialEntries={['/tasks?demo']}><DemoRoutes /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Call Mum' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }))

    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeVisible()
    await waitFor(() => expect(screen.getByText('Call Mum')).toBeVisible())
    expect(supabaseState.client).toBeNull()
  })
})
