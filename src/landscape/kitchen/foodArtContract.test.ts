import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

interface FoodValidation {
  dishes: string[]
  ingredients: string[]
  packaging: string[]
  menuCopyVerified: boolean
  transparentCornersVerified: boolean
}

describe('reference-remake food art contract', () => {
  it('validates the complete finished-dish, ingredient and packaging set', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/art-remake/validate-food-art.mjs', '--json'], {
      encoding: 'utf8',
    })) as FoodValidation

    expect(result.dishes).toHaveLength(5)
    expect(result.ingredients).toHaveLength(18)
    expect(result.packaging).toEqual(['takeaway-bag.png'])
    expect(result.menuCopyVerified).toBe(true)
    expect(result.transparentCornersVerified).toBe(true)
  })
})
