import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import GoalsPage from './GoalsPage.jsx'

test('renders the goal board and adds a demo goal', async () => {
  render(<GoalsPage />)

  expect(screen.getByRole('heading', { name: 'Goals' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Goal title'), { target: { value: 'Make space to learn' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create goal' }))

  expect(await screen.findByText('Make space to learn')).toBeVisible()
})
