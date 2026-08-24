import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { toLogicalScenePoint } from '../../landscape/geometry'
import { RECIPES } from '../../landscape/campaign'
import { isIntentionalPointerDrag } from '../../landscape/pointerIntent'
import type { KitchenAction } from '../../landscape/kitchen/reducer'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'

interface DishDrag {
  pointerId: number
  pointerType: string
  slotId: SlotId
  moving: boolean
  startX: number
  startY: number
}

export function ServingTray({ state, dispatch, findCustomerAtPoint }: {
  state: KitchenState
  dispatch: (action: KitchenAction) => void
  findCustomerAtPoint: (clientX: number, clientY: number) => string | null
}) {
  const drag = useRef<DishDrag | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; src: string } | null>(null)
  const dishes = state.slots.filter((slot) => slot.phase === 'on-tray' && slot.recipeId)
  const deliverToIntendedCustomer = (slotId: SlotId) => {
    const slot = state.slots.find((candidate) => candidate.id === slotId)
    const customer = state.customers.find((candidate) => (
      candidate.presence === 'active' && candidate.order.id === slot?.orderId
    ))
    if (customer) dispatch({ type: 'DELIVER', slotId, customerId: customer.id })
  }

  const finish = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!cancelled) {
      if (active.moving) {
        const customerId = findCustomerAtPoint(event.clientX, event.clientY)
        if (customerId) dispatch({ type: 'DELIVER', slotId: active.slotId, customerId })
      } else {
        deliverToIntendedCustomer(active.slotId)
      }
    }
    drag.current = null
    setGhost(null)
  }

  return (
    <>
      <div className="serving-tray" aria-label="出餐托盘">
        {dishes.map((slot) => {
          const src = RECIPES[slot.recipeId!].image
          return (
            <button
              type="button"
              className="serving-tray__dish"
              data-tray-slot-id={slot.id}
              key={slot.id}
              aria-label={`${RECIPES[slot.recipeId!].name}，点击自动递给对应顾客，也可拖给顾客`}
              onClick={(event) => {
                if (event.detail === 0) deliverToIntendedCustomer(slot.id)
              }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId)
                drag.current = {
                  pointerId: event.pointerId,
                  pointerType: event.pointerType,
                  slotId: slot.id,
                  moving: false,
                  startX: event.clientX,
                  startY: event.clientY,
                }
              }}
              onPointerMove={(event) => {
                const active = drag.current
                if (!active || active.pointerId !== event.pointerId) return
                if (!active.moving && isIntentionalPointerDrag(
                  active.pointerType,
                  event.clientX - active.startX,
                  event.clientY - active.startY,
                )) active.moving = true
                if (active.moving) {
                  const point = toLogicalScenePoint(event.currentTarget, event.clientX, event.clientY)
                  setGhost({ ...point, src })
                }
              }}
              onPointerUp={(event) => finish(event)}
              onPointerCancel={(event) => finish(event, true)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                deliverToIntendedCustomer(slot.id)
              }}
            >
              <img src={src} alt="" draggable={false} />
            </button>
          )
        })}
      </div>
      {ghost && <img className="serving-tray__ghost" src={ghost.src} alt="" aria-hidden="true" style={{ left: ghost.x, top: ghost.y }} draggable={false} />}
    </>
  )
}
