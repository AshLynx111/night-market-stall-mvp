import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { toLogicalScenePoint } from '../../landscape/geometry'
import { RECIPES } from '../../landscape/campaign'
import type { KitchenAction } from '../../landscape/kitchen/reducer'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'

interface DishDrag {
  pointerId: number
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

  const finish = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!cancelled && active.moving) {
      const customerId = findCustomerAtPoint(event.clientX, event.clientY)
      if (customerId) dispatch({ type: 'DELIVER', slotId: active.slotId, customerId })
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
              aria-label={`把${RECIPES[slot.recipeId!].name}递给顾客`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId)
                drag.current = { pointerId: event.pointerId, slotId: slot.id, moving: false, startX: event.clientX, startY: event.clientY }
              }}
              onPointerMove={(event) => {
                const active = drag.current
                if (!active || active.pointerId !== event.pointerId) return
                if (!active.moving && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 4) active.moving = true
                if (active.moving) {
                  const point = toLogicalScenePoint(event.currentTarget, event.clientX, event.clientY)
                  setGhost({ ...point, src })
                }
              }}
              onPointerUp={(event) => finish(event)}
              onPointerCancel={(event) => finish(event, true)}
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
