import type { CSSProperties } from 'react'
import { RECIPES, ingredientForCookingStep, type IngredientId, type OrderModifier, type RecipeId } from '../../landscape/campaign'
import { ingredientFoodArt } from '../../landscape/kitchen/assets'
import type { OrderBubblePose } from '../../landscape/kitchen/orderBubbleLayout'
import type { CustomerState } from '../../landscape/kitchen/types'
import { GameIcon } from './GameIcon'
import { useI18n } from '../../i18n/I18nProvider'

export function recipeOrderIngredients(recipeId: RecipeId) {
  return RECIPES[recipeId].steps.flatMap((step) => {
    const id = ingredientForCookingStep(step)
    return id ? [{ id, label: step.label, art: ingredientFoodArt(id) }] : []
  })
}

export function orderBubbleDensity(ingredientCount: number, modifierCount: number): 'regular' | 'compact' {
  return ingredientCount > 6 || (ingredientCount >= 6 && modifierCount > 0) ? 'compact' : 'regular'
}

export function OrderBubble({ customer, pose, critical = false }: {
  customer: CustomerState
  pose: OrderBubblePose
  critical?: boolean
}) {
  const { t, domain } = useI18n()
  const recipe = RECIPES[customer.order.recipeId]
  const ingredients = recipeOrderIngredients(recipe.id)
  const density = orderBubbleDensity(ingredients.length, customer.order.modifiers.length)
  const patienceRatio = Math.max(0, Math.min(1, customer.patienceMs / customer.maxPatienceMs))
  const patienceLevel = patienceRatio <= .2 ? 'critical' : patienceRatio <= .45 ? 'warning' : 'steady'
  const modifierDescription = (modifier: OrderModifier) => {
    if (modifier.kind === 'extra') return t('order.extra', { ingredient: domain.ingredientText(modifier.ingredient) })
    if (modifier.kind === 'without') return t('order.without', { ingredient: domain.ingredientText(modifier.ingredient) })
    return t(modifier.level === 'mild' ? 'order.mild' : modifier.level === 'hot' ? 'order.hot' : 'order.normal')
  }
  const modifiers = customer.order.modifiers.length
    ? customer.order.modifiers.map(modifierDescription).join(', ')
    : t('order.none')

  return (
    <div
      className={`kitchen-customer__bubble order-bubble-panel ui-text-surface ui-text-surface--paper${critical ? ' is-critical' : ''}`}
      data-customer-bubble-for={customer.id}
      data-order-id={customer.order.id}
      data-patience-level={patienceLevel}
      data-order-density={density}
      data-critical-customer={critical ? 'true' : undefined}
      aria-label={t('order.aria', {
        customer: domain.customerText(customer.name),
        recipe: domain.recipeText(recipe.id, 'name'),
        modifiers,
        seconds: Math.ceil(customer.patienceMs / 1_000),
      })}
      style={{
        '--customer-bubble-x': `${pose.x}px`,
        '--customer-bubble-y': `${pose.y}px`,
        '--customer-bubble-tail-x': `${pose.tailX}px`,
        '--customer-patience': patienceRatio,
      } as CSSProperties}
    >
      <span className="kitchen-customer__order-ingredients" aria-hidden="true">
        {ingredients.map((ingredient, index) => (
          <i className="kitchen-customer__order-ingredient" data-order-ingredient={ingredient.id} title={domain.ingredientText(ingredient.id)} key={`${ingredient.id}-${index}`}>
            <img src={ingredient.art} alt="" draggable={false} />
          </i>
        ))}
      </span>
      {customer.order.modifiers.length > 0 && (
        <span className="kitchen-customer__modifiers" aria-hidden="true">
          {customer.order.modifiers.map((modifier, index) => modifier.kind === 'heat' ? (
            <i
              className="kitchen-customer__modifier kitchen-customer__modifier--heat"
              data-order-modifier-kind="heat"
              data-order-modifier-level={modifier.level}
              title={modifierDescription(modifier)}
              key={`heat-${index}`}
            >
              <GameIcon name="heat" />
              <b>{t(modifier.level === 'mild' ? 'order.heatShortMild' : modifier.level === 'hot' ? 'order.heatShortHot' : 'order.heatShortNormal')}</b>
            </i>
          ) : (
            <i
              className="kitchen-customer__modifier"
              data-order-modifier-kind={modifier.kind}
              data-order-modifier-ingredient={modifier.ingredient}
              title={modifierDescription(modifier)}
              key={`${modifier.kind}-${modifier.ingredient}-${index}`}
            >
              <GameIcon name={modifier.kind === 'extra' ? 'extra' : 'without'} />
              <img src={ingredientFoodArt(modifier.ingredient)} alt="" draggable={false} />
            </i>
          ))}
        </span>
      )}
      <i className="kitchen-customer__patience" aria-hidden="true">
        <span style={{ width: `${patienceRatio * 100}%` }} />
      </i>
    </div>
  )
}
