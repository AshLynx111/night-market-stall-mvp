import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createKitchenState } from '../../landscape/kitchen/state'
import type { OrderBubblePose } from '../../landscape/kitchen/orderBubbleLayout'
import { OrderBubble, recipeOrderIngredients } from './OrderBubble'

const pose: OrderBubblePose = {
  x: 200,
  y: 100,
  tailX: 66,
  rect: { x: 134, y: 100, width: 132, height: 94 },
  clearOfCharacter: true,
}

describe('OrderBubble', () => {
  it('derives a classic order from visual ingredient assets', () => {
    expect(recipeOrderIngredients('classic').map(({ id }) => id)).toEqual(['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'])
  })

  it('marks low patience and renders modifiers without emoji', () => {
    const base = createKitchenState(3, 1).customers[0]
    const customer = { ...base, patienceMs: base.maxPatienceMs * .15 }
    const markup = renderToStaticMarkup(<OrderBubble customer={customer} pose={pose} critical />)
    expect(markup).toContain('data-order-ingredient="noodle"')
    expect(markup).toContain('data-patience-level="critical"')
    expect(markup).toContain('data-critical-customer="true"')
    expect(markup).not.toContain('🌶')
  })
})
