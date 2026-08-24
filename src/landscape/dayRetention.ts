import {
  availableIngredients,
  DAYS,
  ingredientLabel,
  RECIPES,
  type IngredientId,
  type RecipeId,
} from './campaign'

export interface DayRetentionCueModel {
  day: number
  title: string
  story: string
  goal: string
  newIngredients: IngredientId[]
  newRecipes: RecipeId[]
  specialBeat: string | null
  shortHook: string
  accessibleDescription: string
}

const SPECIAL_BEATS: Partial<Record<number, string>> = {
  5: '特别人物登场',
  6: '明星同款热潮',
}

export function retentionCueForDay(day: number): DayRetentionCueModel {
  const current = DAYS.find((candidate) => candidate.day === day)
  if (!current) throw new Error(`Unknown campaign day: ${day}`)

  const previousIngredients = new Set(day === 1 ? [] : availableIngredients(day - 1))
  const previousRecipes = new Set<RecipeId>(day === 1 ? [] : DAYS[day - 2].recipes)
  const newIngredients = availableIngredients(day).filter((ingredient) => !previousIngredients.has(ingredient))
  const newRecipes = current.recipes.filter((recipe) => !previousRecipes.has(recipe))
  const specialBeat = SPECIAL_BEATS[day] ?? null
  const shortHook = specialBeat
    ?? (newRecipes[0] ? `${RECIPES[newRecipes[0]].shortName}解锁` : null)
    ?? (newIngredients.length ? `${newIngredients.map(ingredientLabel).join('、')}上新` : '继续挑战')
  const details = [
    `第 ${day} 天：${current.title}`,
    current.story,
    `目标：${current.goal}`,
    newIngredients.length ? `新食材：${newIngredients.map(ingredientLabel).join('、')}` : null,
    newRecipes.length ? `新订单：${newRecipes.map((recipe) => RECIPES[recipe].shortName).join('、')}` : null,
    specialBeat,
  ].filter((detail): detail is string => Boolean(detail))

  return {
    day,
    title: current.title,
    story: current.story,
    goal: current.goal,
    newIngredients,
    newRecipes,
    specialBeat,
    shortHook,
    accessibleDescription: details.join('。'),
  }
}

export function nextRetentionCue(day: number): DayRetentionCueModel | null {
  if (day >= DAYS.length) return null
  return retentionCueForDay(day + 1)
}
