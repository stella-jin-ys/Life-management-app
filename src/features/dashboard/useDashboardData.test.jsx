import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

const api = vi.hoisted(() => ({
  createHighlight: vi.fn(),
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

afterEach(() => {
  vi.clearAllMocks()
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
