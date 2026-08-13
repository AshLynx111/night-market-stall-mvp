import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Point, Rect } from '../../landscape/geometry'
import { toLogicalPoint, toLogicalScenePoint } from '../../landscape/geometry'
import { measureCut, measureRoll, measureSauce } from '../../landscape/kitchen/gestures'
import { slotExpectedAction } from '../../landscape/kitchen/griddle'
import type { KitchenAction } from '../../landscape/kitchen/reducer'
import { TUTORIAL_GESTURE_RECT } from '../../landscape/kitchen/tutorialPaths'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'
import { ingredientArt } from '../../landscape/kitchen/assets'

type GestureKind = 'sauce' | 'cut' | 'roll'

interface ActiveGesture {
  pointerId: number
  slotId: SlotId
  kind: GestureKind
  points: Point[]
  bounds: DOMRect
}

const LOGICAL_GESTURE_RECT: Rect = TUTORIAL_GESTURE_RECT

function gestureKind(state: KitchenState, slotId: SlotId, sauceEnabled: boolean): GestureKind | null {
  if (state.tutorialMode === 'guided-first-order' && slotId !== 'left') return null
  const id = slotExpectedAction(state, slotId)?.id
  if (id === 'sauce') return sauceEnabled ? id : null
  return id === 'cut' || id === 'roll' ? id : null
}

function logicalPoint(event: ReactPointerEvent<HTMLElement>, bounds: DOMRect) {
  return toLogicalPoint(event.clientX, event.clientY, {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width || 1,
    height: bounds.height || 1,
  }, LOGICAL_GESTURE_RECT.width, LOGICAL_GESTURE_RECT.height)
}

export function CookingGestureLayer({ state, dispatch, sauceEnabled = false }: {
  state: KitchenState
  dispatch: (action: KitchenAction) => void
  sauceEnabled?: boolean
}) {
  const active = useRef<ActiveGesture | null>(null)
  const [tool, setTool] = useState<{ x: number; y: number; kind: GestureKind } | null>(null)

  const completeWithKeyboard = (slotId: SlotId, kind: GestureKind) => {
    const slot = state.slots.find((candidate) => candidate.id === slotId)
    if (!slot) return
    const gesture = kind === 'sauce'
      ? { kind: 'sauce' as const, coverage: 1, uniformity: 1, complete: true }
      : kind === 'cut'
        ? { kind: 'cut' as const, targetIndex: [0, 1, 2].find((index) => !slot.cutTargetIndices.includes(index)) ?? null, accuracy: 1, progress: 1, verticalDeviation: 0, complete: true }
        : { kind: 'roll' as const, progress: 1, verticalDeviation: 0, complete: true }
    dispatch({ type: 'COMPLETE_GESTURE', slotId, gesture })
  }

  const finish = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const gesture = active.current
    if (!gesture || gesture.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId)
    const points = [...gesture.points, logicalPoint(event, gesture.bounds)]
    if (!cancelled) {
      const result = gesture.kind === 'sauce'
        ? measureSauce(points, LOGICAL_GESTURE_RECT)
        : gesture.kind === 'cut'
          ? measureCut(points, LOGICAL_GESTURE_RECT, state.slots.find((slot) => slot.id === gesture.slotId)?.cutTargetIndices ?? [])
          : measureRoll(points, LOGICAL_GESTURE_RECT)
      dispatch({ type: 'COMPLETE_GESTURE', slotId: gesture.slotId, gesture: result })
    }
    active.current = null
    setTool(null)
  }

  return (
    <div className="cooking-gesture-layer">
      {state.slots.map((slot) => {
        const kind = gestureKind(state, slot.id, sauceEnabled)
        if (!kind) return null
        return (
          <div
            key={slot.id}
            className={`cooking-gesture-target cooking-gesture-target--${slot.id}`}
            data-gesture-slot-id={slot.id}
            role="button"
            tabIndex={0}
            aria-label={kind === 'sauce'
              ? `${slot.id === 'left' ? '左侧' : '右侧'}铁板刷酱区，拿起酱刷后在这里来回滑动`
              : `${slot.id === 'left' ? '左侧' : '右侧'}铁板${kind === 'cut' ? '切段' : '卷起'}手势区`}
            onPointerDown={(event) => {
              const boundSlot = event.currentTarget.dataset.gestureSlotId as SlotId
              const boundKind = gestureKind(state, boundSlot, sauceEnabled)
              if (!boundKind) return
              event.currentTarget.setPointerCapture?.(event.pointerId)
              const bounds = event.currentTarget.getBoundingClientRect()
              active.current = {
                pointerId: event.pointerId,
                slotId: boundSlot,
                kind: boundKind,
                bounds,
                points: [logicalPoint(event, bounds)],
              }
              setTool({ ...toLogicalScenePoint(event.currentTarget, event.clientX, event.clientY), kind: boundKind })
            }}
            onPointerMove={(event) => {
              const gesture = active.current
              if (!gesture || gesture.pointerId !== event.pointerId) return
              gesture.points.push(logicalPoint(event, gesture.bounds))
              setTool({ ...toLogicalScenePoint(event.currentTarget, event.clientX, event.clientY), kind: gesture.kind })
            }}
            onPointerUp={(event) => finish(event)}
            onPointerCancel={(event) => finish(event, true)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              const slotId = event.currentTarget.dataset.gestureSlotId as SlotId
              const kind = gestureKind(state, slotId, sauceEnabled)
              if (kind) completeWithKeyboard(slotId, kind)
            }}
          />
        )
      })}
      {tool && (
        <span className={`cooking-gesture-tool cooking-gesture-tool--${tool.kind}`} style={{ left: tool.x, top: tool.y }}>
          {tool.kind === 'sauce'
            ? <img src={ingredientArt('sauce')} alt="" aria-hidden="true" />
            : tool.kind === 'cut' ? '🔪' : '↻'}
        </span>
      )}
    </div>
  )
}
