import type { CSSProperties } from 'react'
import { RECIPES, ingredientForCookingStep, type IngredientId, type OrderModifier, type RecipeId } from '../../landscape/campaign'
import { ingredientFoodArt } from '../../landscape/kitchen/assets'
import type { OrderBubblePose } from '../../landscape/kitchen/orderBubbleLayout'
import type { CustomerState } from '../../landscape/kitchen/types'
import { GameIcon } from './GameIcon'

export function recipeOrderIngredients(recipeId: RecipeId) {
  return RECIPES[recipeId].steps.flatMap((step) => {
    const id = ingredientForCookingStep(step)
    return id ? [{ id, label: step.label, art: ingredientFoodArt(id) }] : []
  })
}

export function orderBubbleDensity(ingredientCount: number, modifierCount: number): 'regular' | 'compact' {
  return ingredientCount > 6 || (ingredientCount >= 6 && modifierCount > 0) ? 'compact' : 'regular'
}

function ingredientLabel(id: IngredientId) {
  for (const recipe of Object.values(RECIPES)) {
    const step = recipe.steps.find((candidate) => ingredientForCookingStep(candidate) === id)
    if (step) return step.label.replace(/^第2[张颗]?/, '')
  }
  return id
}

function modifierDescription(modifier: OrderModifier): string {
  const label = modifier.kind === 'heat' ? '' : ingredientLabel(modifier.ingredient)
  if (modifier.kind === 'extra') return `加量${label}`
  if (modifier.kind === 'without') return `不要${label}`
  return modifier.level === 'mild' ? '少辣' : modifier.level === 'hot' ? '加辣' : '正常辣度'
}

export function OrderBubble({ customer, pose, critical = false }: {
  customer: CustomerState
  pose: OrderBubblePose
  critical?: boolean
}) {
  const recipe = RECIPES[customer.order.recipeId]
  const ingredients = recipeOrderIngredients(recipe.id)
  const density = orderBubbleDensity(ingredients.length, customer.order.modifiers.length)
  const patienceRatio = Math.max(0, Math.min(1, customer.patienceMs / customer.maxPatienceMs))
  const patienceLevel = patienceRatio <= .2 ? 'critical' : patienceRatio <= .45 ? 'warning' : 'steady'
  const modifiers = customer.order.modifiers.length
    ? customer.order.modifiers.map(modifierDescription).join('，')
    : '无特殊要求'

  return (
    <div
      className={`kitchen-customer__bubble${critical ? ' is-critical' : ''}`}
      data-customer-bubble-for={customer.id}
      data-order-id={customer.order.id}
      data-patience-level={patienceLevel}
      data-order-density={density}
      data-critical-customer={critical ? 'true' : undefined}
      aria-label={`${customer.name}的订单：${recipe.name}，${modifiers}，剩余耐心${Math.ceil(customer.patienceMs / 1_000)}秒`}
      style={{
        '--customer-bubble-x': `${pose.x}px`,
        '--customer-bubble-y': `${pose.y}px`,
        '--customer-bubble-tail-x': `${pose.tailX}px`,
        '--customer-patience': patienceRatio,
      } as CSSProperties}
    >
      <span className="kitchen-customer__order-ingredients" aria-hidden="true">
        {ingredients.map((ingredient, index) => (
          <i className="kitchen-customer__order-ingredient" data-order-ingredient={ingredient.id} title={ingredient.label} key={`${ingredient.id}-${index}`}>
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
              <b>{modifier.level === 'mild' ? '少' : modifier.level === 'hot' ? '多' : '中'}</b>
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
