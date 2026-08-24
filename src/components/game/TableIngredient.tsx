import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { IngredientId } from '../../landscape/campaign'
import { toLogicalScenePoint } from '../../landscape/geometry'
import { isIntentionalPointerDrag } from '../../landscape/pointerIntent'
import {
  KITCHEN_RACK_LAYOUTS,
  ghostInnerPolygon,
  ingredientGhostGeometryStyle,
  ingredientRackCellStyle,
  rackInnerPolygons,
  rackRectangles,
  type RackLayout,
} from '../../landscape/kitchen/sceneGeometry'
import type { SlotId } from '../../landscape/kitchen/types'

interface DragState {
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  moving: boolean
}

export function TableIngredient({ id, label, art, rackIndex, rackLayout, painted = false, disabled = false, findSlotAtPoint, onDrop, onTapEgg, onKeyboardApply }: {
  id: IngredientId
  label: string
  art: string
  rackIndex: number
  rackLayout: RackLayout
  painted?: boolean
  disabled?: boolean
  findSlotAtPoint: (clientX: number, clientY: number) => SlotId | null
  onDrop: (id: IngredientId, slotId: SlotId) => void
  onTapEgg: () => void
  onKeyboardApply?: (id: IngredientId) => void
}) {
  const drag = useRef<DragState | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const rackColumns = KITCHEN_RACK_LAYOUTS[rackLayout].columns
  const rackColumn = rackIndex % rackColumns
  const rackRow = Math.floor(rackIndex / rackColumns)
  const rackStyle = ingredientRackCellStyle(rackLayout, rackIndex) as CSSProperties
  const innerMaskPolygon = JSON.stringify(rackInnerPolygons(rackLayout)[rackIndex])
  const controlPolygon = JSON.stringify((() => {
    const control = rackRectangles(rackLayout)[rackIndex]
    return [
      { x: control.left, y: control.top },
      { x: control.right, y: control.top },
      { x: control.right, y: control.bottom },
      { x: control.left, y: control.bottom },
    ]
  })())
  const ghostMaskPolygon = JSON.stringify(ghostInnerPolygon())
  const applyTap = () => {
    if (id === 'egg') onTapEgg()
    else onKeyboardApply?.(id)
  }

  const finish = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!cancelled && id === 'sauce') {
      onKeyboardApply?.(id)
    } else if (!cancelled && active.moving) {
      const slotId = findSlotAtPoint(event.clientX, event.clientY)
      if (slotId) onDrop(id, slotId)
    } else if (!cancelled) {
      applyTap()
    }
    drag.current = null
    setGhost(null)
  }

  return (
    <>
      <button
        type="button"
        className={`table-ingredient table-ingredient--${id}${painted ? ' is-selected' : ''}`}
        disabled={disabled}
        data-ingredient-id={id}
        data-rack-index={rackIndex}
        data-rack-column={rackColumn}
        data-rack-row={rackRow}
        data-control-polygon={controlPolygon}
        data-painted={painted ? 'true' : undefined}
        style={rackStyle}
        aria-label={id === 'sauce'
          ? `${label}，点击拿起酱刷`
          : `${label}，点击自动放置，也可拖到指定铁板`}
        aria-pressed={id === 'sauce' ? painted : undefined}
        onClick={(event) => {
          if (!disabled && event.detail === 0) applyTap()
        }}
        onPointerDown={(event) => {
          if (disabled) return
          event.currentTarget.setPointerCapture?.(event.pointerId)
          drag.current = {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            startX: event.clientX,
            startY: event.clientY,
            moving: false,
          }
        }}
        onPointerMove={(event) => {
          if (disabled) return
          const active = drag.current
          if (!active || active.pointerId !== event.pointerId) return
          if (!active.moving && isIntentionalPointerDrag(
            active.pointerType,
            event.clientX - active.startX,
            event.clientY - active.startY,
          )) active.moving = true
          if (active.moving) setGhost(toLogicalScenePoint(event.currentTarget, event.clientX, event.clientY))
        }}
        onPointerUp={(event) => {
          if (disabled) return
          if (id === 'sauce' && !drag.current) onKeyboardApply?.(id)
          else finish(event)
        }}
        onPointerCancel={(event) => finish(event, true)}
        onKeyDown={(event) => {
          if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return
          event.preventDefault()
          onKeyboardApply?.(id)
        }}
      >
        <span
          className="table-ingredient__viewport"
          data-ingredient-food-viewport="true"
          data-inner-mask-polygon={innerMaskPolygon}
          aria-hidden="true"
        >
          <img className="table-ingredient__food-art" src={art} alt="" draggable={false} />
        </span>
        <span
          className="table-ingredient__label"
          data-ingredient-label-for={id}
          aria-hidden="true"
        >
          {label}
        </span>
      </button>
      {ghost && (
        <span
          className="table-ingredient__ghost"
          data-ingredient-drag-ghost={id}
          data-inner-mask-polygon={ghostMaskPolygon}
          aria-hidden="true"
          style={{ ...ingredientGhostGeometryStyle(), left: ghost.x, top: ghost.y }}
        >
          <span className="table-ingredient__ghost-viewport">
            <img className="table-ingredient__ghost-food-art" src={art} alt="" draggable={false} />
          </span>
        </span>
      )}
    </>
  )
}
