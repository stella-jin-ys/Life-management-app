import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createHighlight: vi.fn(),
  createMeal: vi.fn(),
  loadDashboard: vi.fn(),
  saveFeeling: vi.fn(),
  saveHealth: vi.fn(),
  saveMilestone: vi.fn(),
  saveMood: vi.fn(),
}))

vi.mock('../../lib/lifeApi.js', () => api)

import HighlightsPanel from '../../components/HighlightsPanel.jsx'
import LowBatteryPanel from '../../components/LowBatteryPanel.jsx'
import useDashboardData from './useDashboardData.js'

const user = { id: 'user-1' }
const profile = { timezone: 'Europe/Stockholm' }

function dashboard() {
  return {
    selectedMood: 'steady',
    selectedFeeling: 'drained',
    highlights: [],
    meals: [],
    mealFeedback: { score: 0, represented: [], missing: ['produce', 'protein', 'carbohydrate', 'healthy fat'], feedback: 'Add a meal when it feels useful; there is no score to catch up on.' },
    metrics: [
      { id: 'water', value: 5, target: 8 },
      { id: 'meals', value: 2, target: 3 },
      { id: 'sleep', value: 7, target: 8 },
      { id: 'movement', value: 20, target: 30 },
    ],
    goal: { id: 'goal-1', title: 'Goal', why: 'Why', milestones: [{ id: 'milestone-1', label: 'Step', complete: false }] },
    signal: { percentage: null, status: 'insufficient_data', affirmation: 'Take it gently.', label: 'Drained' },
    entryDate: '2026-09-07',
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('useDashboardData', () => {
  test('restores the prior mood and shows one retry message when its save fails', async () => {
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveMood.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.selectMood('bright'))

    expect(result.current.selectedMood).toBe('bright')
    await waitFor(() => expect(result.current.selectedMood).toBe('steady'))
    expect(result.current.error).toBe('We could not save that change. Please try again.')
  })

  test('restores an optimistic health adjustment when its save fails', async () => {
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveHealth.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => result.current.updateMetric('water', 1))

    expect(result.current.metrics.find(({ id }) => id === 'water').value).toBe(5)
    expect(result.current.error).toBe('We could not save that change. Please try again.')
  })

  test('restores the prior feeling and signal when its save fails', async () => {
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveFeeling.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.selectFeeling('lonely'))

    expect(result.current.selectedFeeling).toBe('lonely')
    await waitFor(() => expect(result.current.selectedFeeling).toBe('drained'))
    expect(result.current.signal).toEqual(dashboard().signal)
    expect(result.current.error).toBe('We could not save that change. Please try again.')
  })

  test('restores the prior milestone state when its save fails', async () => {
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveMilestone.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => result.current.toggleMilestone('milestone-1'))

    expect(result.current.goal.milestones[0].complete).toBe(false)
    expect(result.current.error).toBe('We could not save that change. Please try again.')
  })

  test('serializes rapid mood saves so an older failure cannot undo the newer selection', async () => {
    const first = deferred()
    const second = deferred()
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveMood.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.selectMood('bright'))
    await waitFor(() => expect(api.saveMood).toHaveBeenCalledTimes(1))
    act(() => result.current.selectMood('tender'))
    expect(api.saveMood).toHaveBeenCalledTimes(1)

    first.reject(new Error('offline'))
    await waitFor(() => expect(api.saveMood).toHaveBeenCalledTimes(2))
    second.resolve()

    await waitFor(() => expect(result.current.selectedMood).toBe('tender'))
    expect(api.loadDashboard).toHaveBeenCalledWith('user-1', 'Europe/Stockholm')
    expect(api.saveMood).toHaveBeenNthCalledWith(1, 'user-1', 'bright', 'Europe/Stockholm')
    expect(api.saveMood).toHaveBeenNthCalledWith(2, 'user-1', 'tender', 'Europe/Stockholm')
  })

  test('uses the browser timezone fallback consistently for loading and daily saves', async () => {
    const browserFormatter = Intl.DateTimeFormat
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
      if (args.length === 0) return { resolvedOptions: () => ({ timeZone: 'Pacific/Auckland' }) }
      return new browserFormatter(...args)
    })
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveMood.mockResolvedValue()
    api.saveHealth.mockResolvedValue()
    const { result } = renderHook(() => useDashboardData(user))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.selectMood('bright'))
    await waitFor(() => expect(api.saveMood).toHaveBeenCalled())
    await act(async () => result.current.updateMetric('water', 1))

    expect(api.loadDashboard).toHaveBeenCalledWith('user-1', 'Pacific/Auckland')
    expect(api.saveMood).toHaveBeenCalledWith('user-1', 'bright', 'Pacific/Auckland')
    expect(api.saveHealth).toHaveBeenCalledWith('user-1', expect.any(Array), 'Pacific/Auckland')
  })

  test('serializes rapid feeling saves and keeps the latest signal after an older failure', async () => {
    const first = deferred()
    const second = deferred()
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveFeeling.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.selectFeeling('lonely'))
    await waitFor(() => expect(api.saveFeeling).toHaveBeenCalledTimes(1))
    act(() => result.current.selectFeeling('restless'))
    expect(api.saveFeeling).toHaveBeenCalledTimes(1)

    first.reject(new Error('offline'))
    await waitFor(() => expect(api.saveFeeling).toHaveBeenCalledTimes(2))
    await act(async () => {
      second.resolve({ status: 'available', percentage: 31, total_count: 10 })
      await second.promise
    })

    await waitFor(() => expect(result.current.signal.percentage).toBe(31))
  })

  test('serializes rapid health saves and retains the latest optimistic metrics', async () => {
    const first = deferred()
    const second = deferred()
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveHealth.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { void result.current.updateMetric('water', 1) })
    await waitFor(() => expect(api.saveHealth).toHaveBeenCalledTimes(1))
    act(() => { void result.current.updateMetric('water', 1) })
    expect(api.saveHealth).toHaveBeenCalledTimes(1)

    first.reject(new Error('offline'))
    await waitFor(() => expect(api.saveHealth).toHaveBeenCalledTimes(2))
    second.resolve()

    await waitFor(() => expect(result.current.metrics.find(({ id }) => id === 'water').value).toBe(7))
  })

  test('serializes rapid toggles of the same milestone', async () => {
    const first = deferred()
    const second = deferred()
    api.loadDashboard.mockResolvedValue(dashboard())
    api.saveMilestone.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise)
    const { result } = renderHook(() => useDashboardData(user, profile))

    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { void result.current.toggleMilestone('milestone-1') })
    await waitFor(() => expect(api.saveMilestone).toHaveBeenCalledTimes(1))
    act(() => { void result.current.toggleMilestone('milestone-1') })
    expect(api.saveMilestone).toHaveBeenCalledTimes(1)

    first.resolve()
    await waitFor(() => expect(api.saveMilestone).toHaveBeenCalledTimes(2))
    second.resolve()

    await waitFor(() => expect(result.current.goal.milestones[0].complete).toBe(false))
  })

  test('removes a failed optimistic highlight while preserving the form input for retry', async () => {
    api.loadDashboard.mockResolvedValue(dashboard())
    api.createHighlight.mockRejectedValue(new Error('offline'))

    function TestPage() {
      const data = useDashboardData(user, profile)
      return <><p role="alert">{data.error}</p><HighlightsPanel onAddHighlight={data.addHighlight} /></>
    }

    render(<TestPage />)
    await waitFor(() => expect(api.loadDashboard).toHaveBeenCalled())
    const input = screen.getByRole('textbox', { name: 'Quick highlight' })
    fireEvent.change(input, { target: { value: 'Called a friend' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save quick highlight' }))

    await waitFor(() => expect(input).toHaveValue('Called a friend'))
    expect(screen.getByRole('alert')).toHaveTextContent('We could not save that change. Please try again.')
  })

  test('renders an honest privacy placeholder instead of a fabricated signal percentage', () => {
    render(<LowBatteryPanel feelings={[]} selectedFeeling="drained"
      signal={{ percentage: 72, status: 'insufficient_data', affirmation: 'Take it gently.' }} />)

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByText('72%')).not.toBeInTheDocument()
  })
})
