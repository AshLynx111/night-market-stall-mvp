import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { KitchenScene } from '../components/game/KitchenScene'
import type { KitchenInteractionIntent } from './gameplayObserver'
import { advanceCustomers } from '../landscape/kitchen/queue'
import { createKitchenState } from '../landscape/kitchen/state'
import type { KitchenState } from '../landscape/kitchen/types'

let root: Root | null = null

function activeState() {
  return advanceCustomers(createKitchenState(1, 100), 2_600)
}

function renderScene(state: KitchenState) {
  const container = document.createElement('div')
  document.body.append(container)
  const dispatch = vi.fn()
  const onTelemetryIntent = vi.fn<(intent: KitchenInteractionIntent) => void>()
  root = createRoot(container)
  act(() => root?.render(
    <KitchenScene state={state} dispatch={dispatch} onTelemetryIntent={onTelemetryIntent} />,
  ))
  return { container, dispatch, onTelemetryIntent }
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
})

describe('cooking telemetry intents', () => {
  it('reports one selected ingredient without changing dispatch semantics', () => {
    const { container, dispatch, onTelemetryIntent } = renderScene(activeState())
    act(() => container.querySelector<HTMLButtonElement>('[data-ingredient-id="noodle"]')!.click())

    expect(onTelemetryIntent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'ingredient_selected', ingredientId: 'noodle', slotId: 'left', accepted: true,
    }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
  })

  it('reports accepted serve attempts with stable ids', () => {
    const base = activeState()
    const customer = base.customers[0]
    const state: KitchenState = {
      ...base,
      slots: [{
        ...base.slots[0],
        phase: 'on-tray',
        orderId: customer.order.id,
        recipeId: customer.order.recipeId,
        completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
      }, base.slots[1]],
    }
    const { container, dispatch, onTelemetryIntent } = renderScene(state)
    act(() => container.querySelector<HTMLButtonElement>('[data-tray-slot-id="left"]')!.click())

    expect(onTelemetryIntent).toHaveBeenCalledWith({
      kind: 'serve_attempted',
      recipeId: 'classic',
      slotId: 'left',
      customerId: customer.id,
      accepted: true,
    })
    expect(dispatch).toHaveBeenCalledWith({ type: 'DELIVER', slotId: 'left', customerId: customer.id })
  })

  it('reports griddle discard without changing the action', () => {
    const base = activeState()
    const state: KitchenState = {
      ...base,
      slots: [{ ...base.slots[0], phase: 'assembling', recipeId: 'classic', orderId: base.customers[0].order.id }, base.slots[1]],
    }
    const { container, dispatch, onTelemetryIntent } = renderScene(state)
    act(() => container.querySelector<HTMLButtonElement>('[data-discard-slot-id="left"]')!.click())

    expect(onTelemetryIntent).toHaveBeenCalledWith({ kind: 'griddle_discarded', recipeId: 'classic', slotId: 'left' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'DISCARD_SLOT', slotId: 'left' })
  })
})
