import { describe, expect, it } from 'vitest'
import { availableIngredients, DAYS, RECIPES, type RecipeId, type StepId } from '../landscape/campaign'
import { retentionCueForDay } from '../landscape/dayRetention'
import { translate, type Locale } from './core'
import { createDomainI18n } from './domain'

const domainFor = (locale: Locale) => createDomainI18n((key, values) => translate(locale, key, values))
const cjk = /[\u3400-\u9fff]/

describe('campaign presentation translations', () => {
  it('covers every day, recipe, ingredient and cooking step in English', () => {
    const domain = domainFor('en')
    for (const day of DAYS) {
      expect(domain.dayText(day.day, 'title')).not.toMatch(cjk)
      expect(domain.dayText(day.day, 'story')).not.toMatch(cjk)
      expect(domain.dayText(day.day, 'goal')).not.toMatch(cjk)
    }
    for (const id of Object.keys(RECIPES) as RecipeId[]) {
      expect(domain.recipeText(id, 'name')).not.toMatch(cjk)
      expect(domain.recipeText(id, 'shortName')).not.toMatch(cjk)
      for (const step of RECIPES[id].steps) {
        expect(domain.stepText(step.id as StepId, 'label')).not.toMatch(cjk)
        expect(domain.stepText(step.id as StepId, 'verb')).not.toMatch(cjk)
      }
    }
    for (const id of availableIngredients(6)) expect(domain.ingredientText(id)).not.toMatch(cjk)
  })

  it('localizes known customer names and safely preserves unknown names', () => {
    const domain = domainFor('en')
    expect(domain.customerText('王奶奶')).toBe('Grandma Wang')
    expect(domain.customerText('林奕辰先生')).toBe('Mr. Lin')
    expect(domain.customerText('Guest 12')).toBe('Guest 12')
  })

  it('rebuilds retention text from stable fields instead of Chinese model copy', () => {
    const domain = domainFor('en')
    const dayTwo = domain.retentionText(retentionCueForDay(2))
    expect(dayTwo.title).toBe('Big Eater Challenge')
    expect(dayTwo.shortHook).toBe('Double Stack unlocked')
    expect(dayTwo.accessibleDescription).not.toMatch(cjk)
  })
})
