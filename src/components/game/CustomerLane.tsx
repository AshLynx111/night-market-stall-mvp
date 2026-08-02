import type { CSSProperties } from 'react'
import { RECIPES, type OrderModifier } from '../../landscape/campaign'
import {
  CUSTOMER_ART_IDS,
  ingredientArt,
  isKitchenCustomerArtId,
  type KitchenCustomerArtId,
} from '../../landscape/kitchen/assets'
import { getCustomerPose } from '../../landscape/kitchen/customerMotion'
import type { OrderBubblePose } from '../../landscape/kitchen/orderBubbleLayout'
import type { CustomerState } from '../../landscape/kitchen/types'
import { CustomerActor } from './CustomerActor'

function resolveArtId(artId: string): KitchenCustomerArtId {
  if (isKitchenCustomerArtId(artId)) return artId
  const compactIndex = Number(artId.match(/(\d+)$/)?.[1])
  return CUSTOMER_ART_IDS[Number.isInteger(compactIndex) ? compactIndex % CUSTOMER_ART_IDS.length : 0]
}

function modifierDescription(modifier: OrderModifier): string {
  if (modifier.kind === 'extra') return `加量${modifier.ingredient}`
  if (modifier.kind === 'without') return `不要${modifier.ingredient}`
  return modifier.level === 'mild' ? '少辣' : modifier.level === 'hot' ? '加辣' : '正常辣度'
}

export function CustomerLane({ customer, bubblePose }: {
  customer: CustomerState
  bubblePose?: OrderBubblePose
}) {
  const pose = getCustomerPose(customer.lane, customer.pathProgress)
  const recipe = RECIPES[customer.order.recipeId]
  const actorStyle = {
    '--customer-x': `${pose.footX}px`,
    '--customer-foot-y': `${pose.footY}px`,
    '--customer-scale': pose.scale,
    '--customer-opacity': pose.opacity,
    '--customer-shadow-opacity': pose.shadowOpacity,
  } as CSSProperties
  const patienceRatio = Math.max(0, customer.patienceMs / customer.maxPatienceMs)
  const modifiers = customer.order.modifiers.length
    ? customer.order.modifiers.map(modifierDescription).join('，')
    : '无特殊要求'

  return (
    <div className={`kitchen-customer kitchen-customer--${customer.lane}`}>
      {customer.presence === 'active' && bubblePose && (
        <div
          className="kitchen-customer__bubble"
          data-customer-bubble-for={customer.id}
          data-order-id={customer.order.id}
          aria-label={`${customer.name}的订单：${recipe.name}，${modifiers}，剩余耐心${Math.ceil(customer.patienceMs / 1_000)}秒`}
          style={{
            '--customer-bubble-x': `${bubblePose.x}px`,
            '--customer-bubble-y': `${bubblePose.y}px`,
            '--customer-bubble-tail-x': `${bubblePose.tailX}px`,
            '--customer-patience': patienceRatio,
          } as CSSProperties}
        >
          <img src={recipe.image} alt={recipe.name} draggable={false} />
          {customer.order.modifiers.length > 0 && (
            <span className="kitchen-customer__modifiers">
              {customer.order.modifiers.map((modifier, index) => modifier.kind === 'heat' ? (
                <i
                  className="kitchen-customer__modifier kitchen-customer__modifier--heat"
                  data-order-modifier-kind="heat"
                  data-order-modifier-level={modifier.level}
                  title={modifierDescription(modifier)}
                  key={`heat-${index}`}
                >{modifier.level === 'mild' ? '🌶½' : modifier.level === 'hot' ? '🌶+' : '🌶'}</i>
              ) : (
                <i
                  className="kitchen-customer__modifier"
                  data-order-modifier-kind={modifier.kind}
                  data-order-modifier-ingredient={modifier.ingredient}
                  title={modifierDescription(modifier)}
                  key={`${modifier.kind}-${modifier.ingredient}-${index}`}
                >
                  <b>{modifier.kind === 'extra' ? '+' : '−'}</b>
                  <img src={ingredientArt(modifier.ingredient)} alt="" draggable={false} />
                </i>
              ))}
            </span>
          )}
          <i className="kitchen-customer__patience" aria-hidden="true">
            <span style={{ width: `${patienceRatio * 100}%` }} />
          </i>
        </div>
      )}
      <CustomerActor customer={customer} artId={resolveArtId(customer.artId)} style={actorStyle} />
    </div>
  )
}
