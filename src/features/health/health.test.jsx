import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import HealthPage from './HealthPage.jsx'

test('renders a meal input and shows the saved food in the demo log', async () => {
  render(<HealthPage />)

  expect(screen.getByRole('heading', { name: 'Diet & health' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Food'), { target: { value: 'Rice bowl' } })
  fireEvent.click(screen.getByLabelText('Protein'))
  fireEvent.click(screen.getByRole('button', { name: 'Save meal' }))

  expect(await screen.findByText('Rice bowl')).toBeVisible()
})
