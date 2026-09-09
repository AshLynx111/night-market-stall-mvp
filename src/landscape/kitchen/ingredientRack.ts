import type { IngredientId } from '../campaign'
import sixWellPlate from '../../assets/runtime/main-ui/kitchen-screen-live-clean.webp'
import expandedWellPlate from '../../assets/runtime/main-ui/kitchen-screen-live-expanded-clean.webp'
import { INGREDIENT_VISUAL_SLOTS } from './ingredientTrayLayout'
import { KITCHEN_RACK_LAYOUTS, type RackLayout } from './sceneGeometry'

// Visual addresses, not unlock rules. Campaign continues to own availability.
// Filtering/reordering a menu must never move a food to another food's profile.
const INGREDIENT_SLOT_ORDER = [
  'noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion',
  'chili-powder', 'turkey-noodle', 'cheese', 'corn', 'orleans', 'bacon',
  'tenderloin', 'enoki',
] as const satisfies readonly IngredientId[]

export const INGREDIENT_RACK_VARIANTS = {
  'approved-2x3': { plate: sixWellPlate, ingredientIds: INGREDIENT_SLOT_ORDER.slice(0, 6) },
  'expanded-3x5': { plate: expandedWellPlate, ingredientIds: INGREDIENT_SLOT_ORDER },
} satisfies Record<RackLayout, { plate: string; ingredientIds: readonly IngredientId[] }>

export function resolveIngredientRack(ingredients: readonly IngredientId[]) {
  if (new Set(ingredients).size !== ingredients.length) throw new Error('Duplicate ingredient in tray')
  const baseIds: readonly IngredientId[] = INGREDIENT_RACK_VARIANTS['approved-2x3'].ingredientIds
  const layout: RackLayout = ingredients.every(id => baseIds.includes(id)) ? 'approved-2x3' : 'expanded-3x5'
  const variant = INGREDIENT_RACK_VARIANTS[layout]
  const ingredientIds: readonly IngredientId[] = variant.ingredientIds
  const slots = ingredients.map(id => {
    const rackIndex = ingredientIds.indexOf(id)
    if (rackIndex < 0 || !INGREDIENT_VISUAL_SLOTS[layout][rackIndex] || !KITCHEN_RACK_LAYOUTS[layout].cells[rackIndex]) {
      throw new Error(`Missing tray seating profile: ${layout}/${id}`)
    }
    return { id, rackIndex }
  })
  return { layout, plate: variant.plate, slots }
}
