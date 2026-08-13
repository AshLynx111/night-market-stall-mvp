import type { CSSProperties } from 'react'
import { stageArt } from '../../landscape/kitchen/assets'
import { slotExpectedAction } from '../../landscape/kitchen/griddle'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'

export function GriddleSlot({ state, slotId, onMoveToTray }: {
  state: KitchenState
  slotId: SlotId
  onMoveToTray: (slotId: SlotId) => void
}) {
  const slot = state.slots.find((candidate) => candidate.id === slotId)!
  const expected = slotExpectedAction(state, slotId)
  const art = slot.recipeId && slot.phase !== 'on-tray'
    ? stageArt(
        slot.recipeId,
        slot.completedStepIds,
        slot.phase === 'cooking' ? slot.heatState : 'none',
        slot.orderModifiers,
      )
    : null
  const heatDuration = Math.max(1, slot.heatBurnAtMs + 1_000)
  const heatProgress = Math.min(1, Math.max(0, slot.heatElapsedMs / heatDuration))
  const status = slot.phase === 'cooking'
    ? slot.heatState === 'raw'
      ? '正在煎…'
      : slot.heatState === 'ready'
        ? `火候正好 · ${expected?.verb ?? '继续制作'}`
        : slot.heatState === 'scorched'
          ? '快焦了！马上操作'
          : '已经焦了'
    : expected?.verb

  return (
    <div
      className={`griddle-slot griddle-slot--${slotId} phase-${slot.phase} heat-${slot.heatState}`}
      data-slot-id={slotId}
      data-griddle-hitbox={slotId}
      data-food-anchor="center"
      data-order-id={slot.orderId ?? undefined}
      data-expected-step-id={expected?.id}
      aria-label={`${slotId === 'left' ? '左侧' : '右侧'}铁板${expected ? `，下一步${expected.verb}` : ''}`}
    >
      {art && (
        <button
          className="griddle-slot__food"
          data-griddle-inner-area={slotId}
          type="button"
          disabled={slot.phase !== 'rolled'}
          onClick={() => slot.phase === 'rolled' && onMoveToTray(slotId)}
          aria-label={slot.phase === 'rolled' ? '把做好的烤冷面移到托盘' : '铁板上的烤冷面'}
        >
          <img className="griddle-slot__stage-art" src={art} alt="" draggable={false} />
        </button>
      )}
      {slot.phase === 'rolled' && <span className="griddle-slot__pack-hint">点一下装盘</span>}
      {slot.phase !== 'empty' && slot.phase !== 'on-tray' && status && (
        <span className="griddle-slot__status" role="status">{status}</span>
      )}
      {(expected?.id === 'cut' || slot.cutTargetIndices.length > 0) && (
        <span className="griddle-slot__cut-marks" aria-label={`已完成 ${slot.cutTargetIndices.length} 个不同切段位置`}>
          {[0, 1, 2].map((targetIndex) => (
            <i
              className={slot.cutTargetIndices.includes(targetIndex) ? 'is-done' : ''}
              data-cut-mark-index={targetIndex}
              key={targetIndex}
            />
          ))}
        </span>
      )}
      {slot.phase === 'cooking' && (
        <>
          <span
            className="griddle-slot__heat-ring"
            style={{ '--heat-progress': heatProgress } as CSSProperties}
            aria-label={slot.heatState === 'ready' ? '火候正好' : slot.heatState === 'burnt' ? '已经焦了' : '正在加热'}
          />
          <span className="griddle-slot__oil" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="griddle-slot__steam" aria-hidden="true"><i /><i /><i /></span>
        </>
      )}
    </div>
  )
}
