import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const api = vi.hoisted(() => ({
  createHighlight: vi.fn(),
  loadDashboard: vi.fn(),
  saveFeeling: vi.fn(),
  saveHealth: vi.fn(),
  saveMilestone: vi.fn(),
  saveMood: vi.fn(),
}))

vi.mock('./lib/lifeApi.js', () => api)

import App from './App.jsx'

function authenticatedDashboard(overrides = {}) {
  return {
    selectedMood: 'steady',
    selectedFeeling: 'drained',
    highlights: [],
    metrics: [
      { id: 'water', label: 'Hydration', value: 5, target: 8, unit: 'glasses', tone: 'coral' },
      { id: 'meals', label: 'Nourishing meals', value: 2, target: 3, unit: 'meals', tone: 'moss' },
      { id: 'sleep', label: 'Sleep', value: 7, target: 8, unit: 'hours', tone: 'lavender' },
      { id: 'movement', label: 'Movement', value: 20, target: 30, unit: 'minutes', tone: 'gold' },
    ],
    goal: { id: 'goal-1', title: 'A goal', why: 'Because it matters', milestones: [{ id: 'milestone-1', label: 'A step', complete: false }] },
    signal: { percentage: null, status: 'insufficient_data', affirmation: 'Take it gently.', label: 'Drained' },
    supporting: { tasks: null, study: null, workout: null, sleep: null },
    ...overrides,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

test('renders the dashboard greeting and navigation', () => {
  render(<App />)

  expect(
    screen.getByRole('heading', { name: 'Good morning, Stella' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('navigation', { name: 'Dashboard' }),
  ).toBeInTheDocument()
})

test('shows every primary destination and marks the selected destination', () => {
  render(<App />)

  for (const name of [
    'Dashboard',
    'Highlights',
    'Diet',
    'Goals',
  ]) {
    expect(screen.getAllByRole('button', { name })[0]).toBeInTheDocument()
  }

  fireEvent.click(screen.getAllByRole('button', { name: 'Highlights' })[0])
  expect(
    screen.getAllByRole('button', { name: 'Highlights' })[0],
  ).toHaveAttribute('aria-current', 'page')
})

test('keeps every destination enabled in the side menu', () => {
  render(<App />)

  for (const name of [
    'Tasks',
    'Finance',
    'Study',
    'Workout',
    'Sleeping',
    'Diary',
    'Settings',
  ]) {
    expect(screen.getAllByRole('button', { name: new RegExp(`^${name}`) })[0]).toBeEnabled()
  }

  fireEvent.click(screen.getAllByRole('button', { name: 'Tasks' })[0])
  expect(screen.getAllByRole('button', { name: 'Tasks' })[0]).toHaveAttribute('aria-current', 'page')
})

test('moves the matching dashboard section into view from the sidebar', () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  render(<App />)

  fireEvent.click(screen.getAllByRole('button', { name: 'Highlights' })[0])

  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
})

test('toggles the compact navigation menu', () => {
  render(<App />)

  const menuButton = screen.getByRole('button', { name: 'Open navigation' })
  expect(menuButton).toHaveAttribute('aria-expanded', 'false')

  fireEvent.click(menuButton)
  expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible()
})

test('responds supportively when a mood is selected', () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: 'Tender' }))

  expect(
    screen.getByText('You can move gently and still move forward.'),
  ).toBeVisible()
})

test('adds a highlight and returns a compliment', () => {
  render(<App />)

  fireEvent.change(screen.getByRole('textbox', { name: 'Quick highlight' }),
    { target: { value: 'Drank water before coffee' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save quick highlight' }))

  expect(screen.getByRole('textbox', { name: 'Quick highlight' })).toHaveValue('')
})

test('uses authored local dashboard data without loading Supabase in demo mode', () => {
  render(<App />)

  expect(api.loadDashboard).not.toHaveBeenCalled()
  expect(screen.getByText('3 of 5 done')).toBeVisible()
})

test('shows an honest demo comfort signal for a selected feeling', () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: 'Overwhelmed' }))

  expect(screen.getByText('Demo community signal')).toBeVisible()
  expect(
    screen.getByText(
      'You do not have to solve the whole day at once. One softer next step is enough.',
    ),
  ).toBeVisible()
})

test('shows hydration progress with a meaningful numeric value', () => {
  render(<App />)

  expect(
    screen.getByRole('progressbar', { name: 'Hydration progress' }),
  ).toHaveAttribute('aria-valuenow', '63')
})

test('updates goal momentum when a milestone is completed', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Goals' })).toBeVisible()
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Run a 10k' }),
  )

  expect(
    screen.getByRole('checkbox', { name: 'Run a 10k' }),
  ).toBeChecked()
})

test('shows persisted supporting-summary empty states for an authenticated empty account', async () => {
  api.loadDashboard.mockResolvedValue(authenticatedDashboard())

  render(<App user={{ id: 'user-1', email: 'stella@example.com' }} profile={{ timezone: 'Europe/Stockholm' }} />)

  await waitFor(() => expect(api.loadDashboard).toHaveBeenCalledWith('user-1', 'Europe/Stockholm'))
  expect(screen.getByText('No tasks yet')).toBeVisible()
  expect(screen.getByText('No study logged today')).toBeVisible()
  expect(screen.getByText('No workouts logged yet')).toBeVisible()
  expect(screen.getByText('No sleep logged yet')).toBeVisible()
})

test('persists authenticated dashboard interactions after loading', async () => {
  api.loadDashboard.mockResolvedValue(authenticatedDashboard())
  api.createHighlight.mockResolvedValue({
    id: 'highlight-1', entry: 'Called a friend', compliment: 'A kind fallback.', complimentStatus: 'fallback', time: 'Now',
  })
  api.saveMood.mockResolvedValue()
  api.saveHealth.mockResolvedValue()
  api.saveMilestone.mockResolvedValue()

  render(<App user={{ id: 'user-1', email: 'stella@example.com' }} profile={{ timezone: 'Europe/Stockholm' }} />)

  await waitFor(() => expect(api.loadDashboard).toHaveBeenCalledWith('user-1', 'Europe/Stockholm'))
  fireEvent.click(screen.getByRole('button', { name: 'Bright' }))
  await waitFor(() => expect(api.saveMood).toHaveBeenCalledWith('user-1', 'bright', 'Europe/Stockholm'))

  const input = screen.getByRole('textbox', { name: 'Quick highlight' })
  fireEvent.change(input, { target: { value: 'Called a friend' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save quick highlight' }))
  expect(screen.getByRole('button', { name: 'Save quick highlight' })).toBeDisabled()
  await waitFor(() => expect(input).toHaveValue(''))
  expect(api.createHighlight).toHaveBeenCalledWith('user-1', 'Called a friend')

  fireEvent.click(screen.getByRole('button', { name: 'Increase Hydration' }))
  await waitFor(() => expect(api.saveHealth).toHaveBeenCalledWith('user-1', expect.any(Array), 'Europe/Stockholm'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'A step' }))
  await waitFor(() => expect(api.saveMilestone).toHaveBeenCalledWith('milestone-1', true))
})
