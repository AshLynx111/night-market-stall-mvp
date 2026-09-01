import { describe, expect, it } from 'vitest'
import { isValidGameEvent } from './events'

describe('analytics event schema', () => {
  it('accepts typed stable-id payloads', () => {
    expect(isValidGameEvent('day_started', { day: 1, guided_tutorial: true })).toBe(true)
    expect(isValidGameEvent('ingredient_placed', {
      ingredient_id: 'noodle', recipe_id: 'classic', step_id: 'noodle', slot_id: 'left',
    })).toBe(true)
  })

  it('rejects invalid and text-bearing payloads without throwing', () => {
    expect(() => isValidGameEvent('day_started', null)).not.toThrow()
    expect(isValidGameEvent('day_started', null)).toBe(false)
    expect(isValidGameEvent('day_started', { day: Number.NaN, guided_tutorial: true })).toBe(false)
    expect(isValidGameEvent('ingredient_placed', {
      ingredient_id: '面皮', recipe_id: 'classic', step_id: 'noodle', slot_id: 'left',
    })).toBe(false)
    expect(isValidGameEvent('home_viewed', { arbitrary: 'copy' })).toBe(false)
  })
})
