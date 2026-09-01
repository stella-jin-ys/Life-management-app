import { describe, expect, test } from 'vitest'

import {
  calculateProgress,
  createCompliment,
  getComfortSignal,
} from './dashboard.js'

describe('createCompliment', () => {
  test('keeps the recorded win visible in its supportive response', () => {
    expect(createCompliment('Took a walk before work')).toContain(
      'Took a walk before work',
    )
  })
})

describe('getComfortSignal', () => {
  test('returns the authored demo signal for a known feeling', () => {
    expect(getComfortSignal('overwhelmed')).toEqual({
      percentage: 68,
      affirmation:
        'You do not have to solve the whole day at once. One softer next step is enough.',
      label: 'Overwhelmed',
    })
  })
})

describe('calculateProgress', () => {
  test('calculates completed milestones as a percentage', () => {
    expect(
      calculateProgress([{ complete: true }, { complete: false }]),
    ).toBe(50)
  })

  test('returns zero when no milestones exist', () => {
    expect(calculateProgress([])).toBe(0)
  })
})
