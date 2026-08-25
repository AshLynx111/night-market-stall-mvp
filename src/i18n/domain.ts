import type {
  IngredientId,
  RecipeId,
  StepId,
} from '../landscape/campaign'
import type { DayRetentionCueModel } from '../landscape/dayRetention'
import type { TFunction, TranslationKey } from './core'

export type DayTextField = 'title' | 'story' | 'goal'
export type RecipeTextField = 'name' | 'shortName'
export type StepTextField = 'label' | 'verb'

export interface LocalizedRetentionText {
  title: string
  story: string
  goal: string
  specialBeat: string | null
  shortHook: string
  accessibleDescription: string
}

export interface DomainI18n {
  dayText: (day: number, field: DayTextField) => string
  recipeText: (id: RecipeId, field: RecipeTextField) => string
  ingredientText: (id: IngredientId) => string
  stepText: (id: StepId, field: StepTextField) => string
  customerText: (name: string) => string
  retentionText: (cue: DayRetentionCueModel) => LocalizedRetentionText
}

const CUSTOMER_KEYS: Record<string, TranslationKey> = {
  小林同学: 'customer.小林同学',
  阿杰: 'customer.阿杰',
  晓雨: 'customer.晓雨',
  社团学长: 'customer.社团学长',
  苏晴: 'customer.苏晴',
  大壮: 'customer.大壮',
  许研: 'customer.许研',
  阿哲: 'customer.阿哲',
  陈老师: 'customer.陈老师',
  王奶奶: 'customer.王奶奶',
  林奕辰先生: 'customer.林奕辰先生',
}

export function createDomainI18n(t: TFunction): DomainI18n {
  const dayText = (day: number, field: DayTextField) => t(`day.${day}.${field}` as TranslationKey)
  const recipeText = (id: RecipeId, field: RecipeTextField) => t(`recipe.${id}.${field}` as TranslationKey)
  const ingredientText = (id: IngredientId) => t(`ingredient.${id}` as TranslationKey)
  const stepText = (id: StepId, field: StepTextField) => t(`step.${id}.${field}` as TranslationKey)
  const customerText = (name: string) => CUSTOMER_KEYS[name] ? t(CUSTOMER_KEYS[name]) : name

  const retentionText = (cue: DayRetentionCueModel): LocalizedRetentionText => {
    const title = dayText(cue.day, 'title')
    const story = dayText(cue.day, 'story')
    const goal = dayText(cue.day, 'goal')
    const specialBeat = cue.day === 5
      ? t('retention.special5')
      : cue.day === 6
        ? t('retention.special6')
        : null
    const shortHook = specialBeat
      ?? (cue.newRecipes[0]
        ? t('retention.recipeUnlocked', { recipe: recipeText(cue.newRecipes[0], 'shortName') })
        : null)
      ?? (cue.newIngredients.length
        ? t('retention.ingredientsNew', { ingredients: cue.newIngredients.map(ingredientText).join(t('retention.listSeparator')) })
        : t('retention.keepGoing'))
    const details = [
      t('retention.day', { day: cue.day, title }),
      story,
      t('retention.goal', { goal }),
      cue.newIngredients.length
        ? t('retention.ingredients', { items: cue.newIngredients.map(ingredientText).join(t('retention.listSeparator')) })
        : null,
      cue.newRecipes.length
        ? t('retention.recipes', { items: cue.newRecipes.map((id) => recipeText(id, 'shortName')).join(t('retention.listSeparator')) })
        : null,
      specialBeat,
    ].filter((detail): detail is string => Boolean(detail))

    return {
      title,
      story,
      goal,
      specialBeat,
      shortHook,
      accessibleDescription: details.join(t('retention.separator')),
    }
  }

  return { dayText, recipeText, ingredientText, stepText, customerText, retentionText }
}
