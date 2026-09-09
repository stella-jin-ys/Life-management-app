import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import HighlightsPage from './HighlightsPage.jsx'

test('renders a highlight input and keeps a demo entry in the log', async () => {
  render(<HighlightsPage />)

  expect(screen.getByRole('heading', { name: 'Highlights' })).toBeVisible()
  fireEvent.change(screen.getByLabelText('Highlight'), { target: { value: 'Finished a small task' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save highlight' }))

  expect(await screen.findByText('Finished a small task')).toBeVisible()
})
