import { describe, expect, test } from 'vitest'

import { getEstimatedFeelingSignal, getMealBalance } from './wellbeing.js'

describe('wellbeing helpers', () => {
  test('returns the same bounded estimate for the same feeling and day', () => {
    const first = getEstimatedFeelingSignal('drained', '2026-09-09')
    const second = getEstimatedFeelingSignal('drained', '2026-09-09')

    expect(second).toEqual(first)
    expect(first.percentage).toBeGreaterThanOrEqual(42)
    expect(first.percentage).toBeLessThanOrEqual(78)
    expect(first.status).toBe('estimated')
  })

  test('returns different stable estimates for different feelings', () => {
    expect(getEstimatedFeelingSignal('drained', '2026-09-09')).not.toEqual(
      getEstimatedFeelingSignal('lonely', '2026-09-09'),
    )
  })

  test('returns an honest empty meal message', () => {
    expect(getMealBalance([])).toMatchObject({ score: 0, represented: [], missing: expect.any(Array) })
    expect(getMealBalance([]).feedback).toContain('Add a meal when it feels useful')
  })

  test('describes a meal day missing one balance group', () => {
    const result = getMealBalance([
      { has_produce: true, has_protein: true, has_carbohydrate: true, has_healthy_fat: false },
    ])

    expect(result.score).toBe(75)
    expect(result.missing).toEqual(['healthy fat'])
    expect(result.feedback).toContain('healthy fat')
  })

  test('recognizes all represented meal groups', () => {
    const result = getMealBalance([
      { has_produce: true, has_protein: true, has_carbohydrate: false, has_healthy_fat: false },
      { has_produce: false, has_protein: false, has_carbohydrate: true, has_healthy_fat: true },
    ])

    expect(result).toMatchObject({ score: 100, missing: [] })
    expect(result.feedback).toContain('balanced mix')
  })
})
