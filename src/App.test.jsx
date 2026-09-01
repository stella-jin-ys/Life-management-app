import { fireEvent, render, screen } from '@testing-library/react'

import App from './App.jsx'

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
    'Low Battery',
    'Diet & Health',
    'Goals',
  ]) {
    expect(screen.getAllByRole('button', { name })[0]).toBeInTheDocument()
  }

  expect(screen.getAllByText('Coming soon')).toHaveLength(11)

  fireEvent.click(screen.getAllByRole('button', { name: 'Highlights' })[0])
  expect(
    screen.getAllByRole('button', { name: 'Highlights' })[0],
  ).toHaveAttribute('aria-current', 'page')
})

test('shows the requested future life areas in the side menu', () => {
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
    expect(screen.getAllByRole('button', { name: new RegExp(`^${name}`) })[0]).toBeDisabled()
  }
})

test('moves the matching dashboard section into view from the sidebar', () => {
  const scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView
  render(<App />)

  fireEvent.click(screen.getAllByRole('button', { name: 'Low Battery' })[0])

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

  fireEvent.click(screen.getByRole('button', { name: 'Add a highlight' }))
  fireEvent.change(
    screen.getByRole('textbox', { name: 'What felt good or moved forward?' }),
    { target: { value: 'Drank water before coffee' } },
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save highlight' }))

  expect(screen.getByText('Drank water before coffee')).toBeVisible()
  expect(
    screen.getByText(/“Drank water before coffee” counts/),
  ).toBeVisible()
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

  expect(screen.getByText('25% complete')).toBeVisible()
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Outline the first chapter' }),
  )

  expect(screen.getByText('50% complete')).toBeVisible()
  expect(
    screen.getByRole('checkbox', { name: 'Outline the first chapter' }),
  ).toBeChecked()
})
