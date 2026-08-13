import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { IngredientId } from '../../landscape/campaign'
import { toLogicalScenePoint } from '../../landscape/geometry'
import type { SlotId } from '../../landscape/kitchen/types'

interface DragState {
  pointerId: number
  startX: number
  startY: number
  moving: boolean
}

export interface IngredientFoodCrop {
  scale: `${number}%`
  shiftX: `${number}%`
  shiftY: `${number}%`
}

// Each source image includes a generated steel bin. These crops isolate its
// food interior inside both rack sizes without introducing another container.
export const INGREDIENT_FOOD_CROPS = {
  noodle: { scale: '275%', shiftX: '0%', shiftY: '0%' },
  egg: { scale: '275%', shiftX: '1%', shiftY: '3%' },
  'hot-dog': { scale: '290%', shiftX: '1%', shiftY: '4%' },
  sauce: { scale: '300%', shiftX: '0%', shiftY: '7%' },
  scallion: { scale: '285%', shiftX: '0%', shiftY: '5%' },
  cilantro: { scale: '280%', shiftX: '1%', shiftY: '6%' },
  onion: { scale: '300%', shiftX: '-1%', shiftY: '5%' },
  'chili-powder': { scale: '280%', shiftX: '-1%', shiftY: '5%' },
  'turkey-noodle': { scale: '285%', shiftX: '-2%', shiftY: '4%' },
  cheese: { scale: '300%', shiftX: '-1%', shiftY: '7%' },
  corn: { scale: '280%', shiftX: '1%', shiftY: '5%' },
  orleans: { scale: '290%', shiftX: '1%', shiftY: '4%' },
  bacon: { scale: '280%', shiftX: '1%', shiftY: '2%' },
  tenderloin: { scale: '290%', shiftX: '0%', shiftY: '3%' },
  enoki: { scale: '280%', shiftX: '0%', shiftY: '4%' },
} as const satisfies Record<IngredientId, IngredientFoodCrop>

export function TableIngredient({ id, label, art, rackIndex, rackColumns = 3, painted = false, disabled = false, findSlotAtPoint, onDrop, onTapEgg, onKeyboardApply }: {
  id: IngredientId
  label: string
  art: string
  rackIndex: number
  rackColumns?: number
  painted?: boolean
  disabled?: boolean
  findSlotAtPoint: (clientX: number, clientY: number) => SlotId | null
  onDrop: (id: IngredientId, slotId: SlotId) => void
  onTapEgg: () => void
  onKeyboardApply?: (id: IngredientId) => void
}) {
  const drag = useRef<DragState | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const rackColumn = rackIndex % rackColumns
  const rackRow = Math.floor(rackIndex / rackColumns)
  const crop = INGREDIENT_FOOD_CROPS[id]
  const rackStyle = {
    '--ingredient-rack-column': rackColumn,
    '--ingredient-rack-row': rackRow,
    '--ingredient-food-scale': crop.scale,
    '--ingredient-food-shift-x': crop.shiftX,
    '--ingredient-food-shift-y': crop.shiftY,
  } as CSSProperties

  const finish = (event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) => {
    const active = drag.current
    if (!active || active.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!cancelled && id === 'sauce') {
      onKeyboardApply?.(id)
    } else if (!cancelled && active.moving) {
      const slotId = findSlotAtPoint(event.clientX, event.clientY)
      if (slotId) onDrop(id, slotId)
    } else if (!cancelled && id === 'egg') {
      onTapEgg()
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
        data-painted={painted ? 'true' : undefined}
        style={rackStyle}
        aria-label={id === 'egg' ? `${label}，点击或拖到铁板` : `${label}，拖到铁板`}
        aria-pressed={id === 'sauce' ? painted : undefined}
        onClick={() => id === 'sauce' && !disabled && onKeyboardApply?.(id)}
        onPointerDown={(event) => {
          if (disabled) return
          event.currentTarget.setPointerCapture?.(event.pointerId)
          drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moving: false }
        }}
        onPointerMove={(event) => {
          if (disabled) return
          const active = drag.current
          if (!active || active.pointerId !== event.pointerId) return
          if (!active.moving && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 4) active.moving = true
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
        <span className="table-ingredient__viewport" aria-hidden="true">
          <img className="table-ingredient__food-art" src={art} alt="" draggable={false} />
        </span>
      </button>
      {ghost && (
        <img
          className="table-ingredient__ghost"
          src={art}
          alt=""
          aria-hidden="true"
          style={{ left: ghost.x, top: ghost.y }}
          draggable={false}
        />
      )}
    </>
  )
}
