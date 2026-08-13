import { INGREDIENT_BIN_ART, RECIPES } from '../campaign'
import type { IngredientId, OrderModifier, RecipeId } from '../campaign'
import type { CustomerMood, HeatState } from './types'

export const CUSTOMER_ART_IDS = [
  'customer-01-xiaolin',
  'customer-02-ajie',
  'customer-03-xiaoyu',
  'customer-04-senior',
  'customer-05-suqing',
  'customer-06-dazhuang',
  'customer-07-xuyan',
  'customer-08-azhe',
  'customer-09-teacher-chen',
  'customer-10-grandma-wang',
] as const

export const CELEBRITY_ART_ID = 'celebrity' as const

export type CustomerArtId = typeof CUSTOMER_ART_IDS[number]
export type KitchenCustomerArtId = CustomerArtId | typeof CELEBRITY_ART_ID

const KITCHEN_CUSTOMER_ART_ID_SET: ReadonlySet<string> = new Set([
  ...CUSTOMER_ART_IDS,
  CELEBRITY_ART_ID,
])

export const CUSTOMER_ART_MOODS = [
  'arriving',
  'ordering',
  'waiting',
  'impatient',
  'urgent',
  'happy',
  'disappointed',
] as const satisfies readonly CustomerMood[]

export interface HeatCheckpoint {
  checkpoint: string
  recipeId: RecipeId
  completedStepIds: readonly string[]
}

export const HEAT_CHECKPOINTS = [
  { checkpoint: '02-egg', recipeId: 'classic', completedStepIds: ['noodle', 'egg'] },
  { checkpoint: '03-hot-dog', recipeId: 'classic', completedStepIds: ['noodle', 'egg', 'hot-dog'] },
  { checkpoint: '02-egg', recipeId: 'big-eater', completedStepIds: ['noodle', 'egg'] },
  {
    checkpoint: '04-second-egg',
    recipeId: 'big-eater',
    completedStepIds: ['noodle', 'egg', 'second-noodle', 'second-egg'],
  },
  { checkpoint: '02-egg', recipeId: 'orleans', completedStepIds: ['noodle', 'egg'] },
  { checkpoint: '03-orleans', recipeId: 'orleans', completedStepIds: ['noodle', 'egg', 'orleans'] },
  { checkpoint: '02-egg', recipeId: 'tenderloin', completedStepIds: ['noodle', 'egg'] },
  {
    checkpoint: '03-turkey-noodle',
    recipeId: 'tenderloin',
    completedStepIds: ['noodle', 'egg', 'turkey-noodle'],
  },
  {
    checkpoint: '04-tenderloin',
    recipeId: 'tenderloin',
    completedStepIds: ['noodle', 'egg', 'turkey-noodle', 'tenderloin'],
  },
  { checkpoint: '02-egg', recipeId: 'signature', completedStepIds: ['noodle', 'egg'] },
  {
    checkpoint: '03-turkey-noodle',
    recipeId: 'signature',
    completedStepIds: ['noodle', 'egg', 'turkey-noodle'],
  },
] as const satisfies readonly HeatCheckpoint[]

const customerEmotionAssets = import.meta.glob<string>(
  '../../assets/approved/customers/emotions/**/*.png',
  { eager: true, import: 'default', query: '?url' },
)

const customerMotionAssets = import.meta.glob<string>(
  '../../assets/approved/customers/motion/*-motion.png',
  { eager: true, import: 'default', query: '?url' },
)

const cumulativeStageAssets = import.meta.glob<string>(
  '../../assets/approved/stages/*/*.png',
  { eager: true, import: 'default', query: '?url' },
)

const heatStageAssets = import.meta.glob<string>(
  '../../assets/approved/stages/heat/*/*.png',
  { eager: true, import: 'default', query: '?url' },
)

const flattenedStageAssets = import.meta.glob<string>(
  '../../assets/approved/stages/flattened/*/*.png',
  { eager: true, import: 'default', query: '?url' },
)

const noScallionStageAssets = import.meta.glob<string>(
  '../../assets/approved/stages/modifiers/no-scallion/*.png',
  { eager: true, import: 'default', query: '?url' },
)

const ingredientAssets: Record<IngredientId, string> = INGREDIENT_BIN_ART
const ingredientFoodAssets = import.meta.glob<string>(
  '../../assets/approved/menu/ingredients/*.png',
  { eager: true, import: 'default', query: '?url' },
)
const INGREDIENT_FOOD_FILE_IDS: Record<IngredientId, string> = {
  noodle: 'noodle-sheet',
  egg: 'egg',
  'hot-dog': 'hot-dog',
  sauce: 'sauce',
  scallion: 'scallion',
  cilantro: 'cilantro',
  onion: 'onion',
  'chili-powder': 'chili-powder',
  'turkey-noodle': 'turkey-noodle',
  cheese: 'cheese',
  corn: 'corn',
  orleans: 'orleans-chicken',
  bacon: 'bacon',
  tenderloin: 'tenderloin',
  enoki: 'enoki',
}

function requireAsset(map: Record<string, string>, key: string): string {
  const value = map[key]
  if (!value) throw new Error(`Missing kitchen art asset: ${key}`)
  return value
}

function sameSteps(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((step, index) => step === right[index])
}

function canonicalStageIndex(recipeId: RecipeId, completedStepIds: readonly string[]): number {
  const canonicalSteps = RECIPES[recipeId].steps
  return completedStepIds.reduce((highest, completed) => {
    const index = canonicalSteps.findIndex((step) => step.id === completed)
    return Math.max(highest, index)
  }, -1)
}

const TOPPING_INGREDIENTS = new Set<IngredientId>([
  'egg',
  'cilantro',
  'onion',
  'chili-powder',
  'bacon',
  'enoki',
])

function completedTopping(
  recipeId: RecipeId,
  completedStepIds: readonly string[],
  modifiers: readonly OrderModifier[],
): IngredientId | null {
  const requested: IngredientId[] = modifiers.flatMap((modifier) => {
    if (modifier.kind === 'extra' && TOPPING_INGREDIENTS.has(modifier.ingredient)) return [modifier.ingredient]
    if (modifier.kind === 'heat' && modifier.level === 'hot') return ['chili-powder']
    return []
  })

  return [...new Set(requested)].find((ingredient) => {
    const canonicalCount = RECIPES[recipeId].steps.filter((step) => step.id === ingredient).length
    const completedCount = completedStepIds.filter((stepId) => stepId === ingredient).length
    return completedCount > canonicalCount
  }) ?? null
}

export function isKitchenCustomerArtId(value: string): value is KitchenCustomerArtId {
  return KITCHEN_CUSTOMER_ART_ID_SET.has(value)
}

export function customerEmotionArt(artId: KitchenCustomerArtId, mood: CustomerMood): string {
  const key = `../../assets/approved/customers/emotions/${artId}/${mood}.png`
  return requireAsset(customerEmotionAssets, key)
}

export function customerMotionAtlas(artId: KitchenCustomerArtId): string {
  const key = `../../assets/approved/customers/motion/${artId}-motion.png`
  return requireAsset(customerMotionAssets, key)
}

export function ingredientArt(id: IngredientId): string {
  return requireAsset(ingredientAssets, id)
}

export function ingredientFoodArt(id: IngredientId): string {
  return requireAsset(ingredientFoodAssets, `../../assets/approved/menu/ingredients/ingredient-${INGREDIENT_FOOD_FILE_IDS[id]}.png`)
}

export function stageArt(
  recipeId: RecipeId,
  completedStepIds: readonly string[],
  heatState: HeatState,
  modifiers: readonly OrderModifier[] = [],
): string {
  if (heatState !== 'none') {
    const exactCheckpoint = HEAT_CHECKPOINTS.find(
      (candidate) => candidate.recipeId === recipeId && sameSteps(candidate.completedStepIds, completedStepIds),
    )
    if (exactCheckpoint) {
      const key = `../../assets/approved/stages/heat/${recipeId}/${exactCheckpoint.checkpoint}-${heatState}.png`
      return requireAsset(heatStageAssets, key)
    }
  }

  const canonicalSteps = RECIPES[recipeId].steps
  const canonicalIndex = canonicalStageIndex(recipeId, completedStepIds)
  const withoutScallion = modifiers.some(
    (modifier) => modifier.kind === 'without' && modifier.ingredient === 'scallion',
  )
  const topping = completedTopping(recipeId, completedStepIds, modifiers)
  if (withoutScallion && completedStepIds.includes('roll')) {
    if (topping === 'enoki' || topping === 'chili-powder') {
      const key = `../../assets/approved/stages/flattened/${recipeId}/no-scallion-${recipeId}-roll--${topping}.png`
      return requireAsset(flattenedStageAssets, key)
    }
    const key = `../../assets/approved/stages/modifiers/no-scallion/${recipeId}-roll.png`
    return requireAsset(noScallionStageAssets, key)
  }
  if (withoutScallion && completedStepIds.includes('cut')) {
    if (topping === 'enoki' || topping === 'chili-powder') {
      const key = `../../assets/approved/stages/flattened/${recipeId}/no-scallion-${recipeId}-cut--${topping}.png`
      return requireAsset(flattenedStageAssets, key)
    }
    const key = `../../assets/approved/stages/modifiers/no-scallion/${recipeId}-cut.png`
    return requireAsset(noScallionStageAssets, key)
  }
  const stageIndex = canonicalIndex + 1
  const index = String(stageIndex).padStart(2, '0')
  const stage = canonicalIndex < 0 ? 'empty' : canonicalSteps[canonicalIndex].id
  if (topping) {
    const key = `../../assets/approved/stages/flattened/${recipeId}/${recipeId}-${index}-${stage}--${topping}.png`
    return requireAsset(flattenedStageAssets, key)
  }
  const key = `../../assets/approved/stages/${recipeId}/${recipeId}-${index}-${stage}.png`
  return requireAsset(cumulativeStageAssets, key)
}
