import { describe, expect, it } from 'vitest'
import { availableIngredients, type IngredientId } from '../campaign'
import { INGREDIENT_RACK_VARIANTS, resolveIngredientRack } from './ingredientRack'
import { INGREDIENT_VISUAL_SLOTS } from './ingredientTrayLayout'
import { INGREDIENT_VISUAL_BOUNDS } from './ingredientVisualBounds'
import { KITCHEN_RACK_LAYOUTS, kitchenGeometryStyle, type RackLayout } from './sceneGeometry'

describe('shared gameplay ingredient rack', () => {
  it.each([[1, 5], [2, 8], [3, 11], [4, 13], [5, 15], [6, 15]])('routes Day %i and all %i foods through the same seating system', (day, count) => {
    const ids = availableIngredients(day)
    const rack = resolveIngredientRack(ids)
    expect(rack.slots).toHaveLength(count)
    expect(rack.layout).toBe(day === 1 ? 'approved-2x3' : 'expanded-3x5')
    expect(rack.plate).toContain(day === 1 ? 'kitchen-screen-live-clean' : 'kitchen-screen-live-expanded-clean')
    expect(rack.slots.map(slot => slot.id)).toEqual(ids)
    expect(rack.slots.map(slot => slot.rackIndex)).toEqual(Array.from({ length: count }, (_, index) => index))
  })

  it('keeps each food in its calibrated well when a menu is reordered or sparse', () => {
    expect(resolveIngredientRack(['corn', 'enoki', 'noodle']).slots).toEqual([
      { id: 'corn', rackIndex: 10 }, { id: 'enoki', rackIndex: 14 }, { id: 'noodle', rackIndex: 0 },
    ])
    expect(resolveIngredientRack(['enoki']).layout).toBe('expanded-3x5')
    expect(resolveIngredientRack(['cilantro', 'egg']).slots).toEqual([
      { id: 'cilantro', rackIndex: 5 }, { id: 'egg', rackIndex: 1 },
    ])
  })

  it('supports every occupied count through full capacity without inventing a grid fallback', () => {
    const ids = availableIngredients(6)
    for (let count = 0; count <= ids.length; count++) {
      const rack = resolveIngredientRack(ids.slice(0, count))
      expect(rack.slots).toHaveLength(count)
      expect(rack.layout).toBe(count <= 6 ? 'approved-2x3' : 'expanded-3x5')
    }
    for (const layout of Object.keys(INGREDIENT_RACK_VARIANTS) as RackLayout[]) {
      const geometry = KITCHEN_RACK_LAYOUTS[layout]
      expect(geometry.cells).toHaveLength(geometry.columns * geometry.rows)
      expect(INGREDIENT_RACK_VARIANTS[layout].ingredientIds).toHaveLength(geometry.cells.length)
      expect(INGREDIENT_VISUAL_SLOTS[layout]).toHaveLength(geometry.cells.length)
      expect(Object.keys(kitchenGeometryStyle(layout)).filter(key => key.startsWith('--ingredient-rack-'))).toEqual([
        '--ingredient-rack-columns', '--ingredient-rack-rows',
      ])
    }
    expect([...INGREDIENT_RACK_VARIANTS['expanded-3x5'].ingredientIds].sort()).toEqual(Object.keys(INGREDIENT_VISUAL_BOUNDS).sort())
  })

  it('rejects duplicate or unmapped food instead of silently drawing it in a generic slot', () => {
    expect(() => resolveIngredientRack(['egg', 'egg'])).toThrow('Duplicate ingredient')
    expect(() => resolveIngredientRack(['unmapped' as IngredientId])).toThrow('Missing tray seating profile')
  })
})
