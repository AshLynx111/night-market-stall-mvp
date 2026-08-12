import { describe, expect, it } from 'vitest'
import { INGREDIENT_UNLOCK_DAY, RECIPES } from '../campaign'
import {
  CUSTOMER_ART_IDS,
  CUSTOMER_ART_MOODS,
  CELEBRITY_ART_ID,
  HEAT_CHECKPOINTS,
  customerEmotionArt,
  customerMotionAtlas,
  ingredientArt,
  stageArt,
  isKitchenCustomerArtId,
} from './assets'
import type { CustomerArtId } from './assets'

describe('kitchen art manifest', () => {
  it('keeps legacy motion atlases resolvable even though horizontal entrances use emotion art', () => {
    for (const artId of [...CUSTOMER_ART_IDS, CELEBRITY_ART_ID]) {
      expect(customerMotionAtlas(artId)).toMatch(/-motion\.png(?:\?|$)/)
    }
  })

  it('resolves all seven emotions for every regular customer', () => {
    for (const customerId of CUSTOMER_ART_IDS) {
      for (const mood of CUSTOMER_ART_MOODS) {
        expect(customerEmotionArt(customerId, mood)).toMatch(/\.png$/)
      }
    }
  })

  it('resolves all seven emotions for the celebrity customer', () => {
    for (const mood of CUSTOMER_ART_MOODS) {
      expect(customerEmotionArt(CELEBRITY_ART_ID, mood)).toMatch(/\.png$/)
    }
  })

  it('resolves every heat state at each declared checkpoint', () => {
    for (const checkpoint of HEAT_CHECKPOINTS) {
      for (const heat of ['raw', 'ready', 'scorched', 'burnt'] as const) {
        expect(stageArt(checkpoint.recipeId, checkpoint.completedStepIds, heat)).toMatch(/\.png$/)
      }
    }
  })

  it('resolves every tabletop ingredient', () => {
    for (const id of Object.keys(INGREDIENT_UNLOCK_DAY) as (keyof typeof INGREDIENT_UNLOCK_DAY)[]) {
      expect(ingredientArt(id)).toMatch(new RegExp(`ingredient-bin-${id}\\.png$`))
    }
  })

  it('resolves every existing cumulative recipe stage', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(stageArt(recipe.id, [], 'none')).toMatch(/\.png$/)
      for (let count = 1; count <= recipe.steps.length; count += 1) {
        const completedStepIds = recipe.steps.slice(0, count).map((step) => step.id)
        expect(stageArt(recipe.id, completedStepIds, 'none')).toMatch(/\.png$/)
      }
    }
  })

  it('uses one flattened cumulative stage for Day 4 bacon heat', () => {
    const modifiers = [{ kind: 'extra' as const, ingredient: 'bacon' as const }]
    const completed = ['noodle', 'egg', 'hot-dog', 'bacon']

    expect(() => stageArt('classic', completed, 'raw', modifiers)).not.toThrow()
    expect(() => stageArt('classic', completed, 'ready', modifiers)).not.toThrow()
    expect(stageArt('classic', completed, 'raw', modifiers)).toMatch(/flattened.*classic.*bacon.*\.png/)
    expect(stageArt('classic', completed, 'ready', modifiers)).toMatch(/flattened.*classic.*bacon.*\.png/)
  })

  it('keeps the latest signature corn stage under unauthored bacon raw and ready heat', () => {
    const modifiers = [{ kind: 'extra' as const, ingredient: 'bacon' as const }]
    const completed = ['noodle', 'egg', 'turkey-noodle', 'cheese', 'corn', 'bacon']

    for (const heat of ['raw', 'ready'] as const) {
      const base = stageArt('signature', completed, heat, modifiers)
      expect(base).toMatch(/flattened.*signature-05-corn--bacon.*\.png/)
      expect(base).not.toMatch(/03-turkey-noodle/)
    }
  })

  it('keeps completed extras visible and selects physical no-scallion cut and roll stages', () => {
    const modifiers = [
      { kind: 'extra' as const, ingredient: 'enoki' as const },
      { kind: 'without' as const, ingredient: 'scallion' as const },
      { kind: 'heat' as const, level: 'mild' as const },
    ]
    const beforeExtra = ['noodle', 'egg', 'turkey-noodle', 'cheese', 'corn']
    const afterExtra = [...beforeExtra, 'enoki']

    expect(stageArt('signature', beforeExtra, 'none', modifiers)).not.toMatch(/flattened/)
    expect(stageArt('signature', [...afterExtra, 'sauce'], 'none', modifiers)).toMatch(/flattened.*enoki/)
    expect(stageArt('signature', [...afterExtra, 'sauce', 'cut'], 'none', modifiers))
      .toMatch(/no-scallion.*signature-cut.*\.png/)
    expect(stageArt('signature', [...afterExtra, 'sauce', 'cut', 'roll'], 'none', modifiers))
      .toMatch(/no-scallion.*signature-roll.*\.png/)
  })

  it('resolves every supported topping and keeps it visible through finishing gestures', () => {
    const cases = [
      ['egg', ['egg', 'egg']],
      ['cilantro', ['cilantro']],
      ['onion', ['onion']],
      ['chili-powder', ['chili-powder']],
      ['bacon', ['bacon']],
      ['enoki', ['enoki']],
    ] as const

    for (const [ingredient, completed] of cases) {
      const modifiers = [{ kind: 'extra' as const, ingredient }]
      expect(stageArt('signature', [...completed, 'sauce', 'cut', 'roll'], 'none', modifiers))
        .toMatch(new RegExp(`flattened.*${ingredient}.*\\.png`))
    }
  })

  it('resolves physical no-scallion cut and roll art for every recipe', () => {
    const modifiers = [{ kind: 'without' as const, ingredient: 'scallion' as const }]

    for (const recipeId of Object.keys(RECIPES) as (keyof typeof RECIPES)[]) {
      expect(stageArt(recipeId, ['cut'], 'none', modifiers)).toMatch(new RegExp(`no-scallion.*${recipeId}-cut.*\\.png`))
      expect(stageArt(recipeId, ['cut', 'roll'], 'none', modifiers)).toMatch(new RegExp(`no-scallion.*${recipeId}-roll.*\\.png`))
    }
  })

  it('throws a useful error when a requested asset is absent', () => {
    expect(() => customerEmotionArt('missing-customer' as CustomerArtId, 'waiting')).toThrow(
      /Missing kitchen art asset/,
    )
  })

  it('validates dynamic customer art identifiers before typed lookup', () => {
    expect(isKitchenCustomerArtId(CUSTOMER_ART_IDS[0])).toBe(true)
    expect(isKitchenCustomerArtId(CELEBRITY_ART_ID)).toBe(true)
    expect(isKitchenCustomerArtId('missing-customer')).toBe(false)
  })
})
