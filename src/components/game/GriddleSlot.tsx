import type { CSSProperties } from 'react'
import { stageArt } from '../../landscape/kitchen/assets'
import { slotExpectedAction } from '../../landscape/kitchen/griddle'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'
import { useI18n } from '../../i18n/I18nProvider'

export function GriddleSlot({ state, slotId, onMoveToTray }: {
  state: KitchenState
  slotId: SlotId
  onMoveToTray: (slotId: SlotId) => void
}) {
  const { t, domain } = useI18n()
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
      ? t('griddle.cooking')
      : slot.heatState === 'ready'
        ? t('griddle.ready', { verb: expected ? domain.stepText(expected.id, 'verb') : t('griddle.continue') })
        : slot.heatState === 'scorched'
          ? t('griddle.scorched')
          : t('griddle.burnt')
    : expected ? domain.stepText(expected.id, 'verb') : undefined

  return (
    <div
      className={`griddle-slot griddle-slot--${slotId} phase-${slot.phase} heat-${slot.heatState}`}
      data-slot-id={slotId}
      data-griddle-hitbox={slotId}
      data-food-anchor="center"
      data-order-id={slot.orderId ?? undefined}
      data-expected-step-id={expected?.id}
      data-stage-step={slot.completedStepIds.at(-1) ?? 'empty'}
      data-sauce-strokes={slot.sauceStrokeCount ?? 0}
      data-cut-count={slot.cutTargetIndices.length}
      aria-label={t('griddle.aria', {
        side: t(slotId === 'left' ? 'game.left' : 'game.right'),
        next: expected ? t('griddle.next', { verb: domain.stepText(expected.id, 'verb') }) : '',
      })}
    >
      {art && (
        <button
          className="griddle-slot__food"
          data-griddle-inner-area={slotId}
          type="button"
          disabled={slot.phase !== 'rolled'}
          onClick={() => slot.phase === 'rolled' && onMoveToTray(slotId)}
          aria-label={t(slot.phase === 'rolled' ? 'griddle.moveToTray' : 'griddle.food')}
        >
          <img className="griddle-slot__stage-art" src={art} alt="" draggable={false} />
        </button>
      )}
      {slot.phase === 'rolled' && <span className="griddle-slot__pack-hint ui-text-chip">{t('griddle.packHint')}</span>}
      {slot.phase !== 'empty' && slot.phase !== 'on-tray' && status && (
        <span className="griddle-slot__status" role="status">{status}</span>
      )}
      {(expected?.id === 'cut' || slot.cutTargetIndices.length > 0) && (
        <span className="griddle-slot__cut-marks" aria-label={t('griddle.cutProgress', { count: slot.cutTargetIndices.length })}>
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
            aria-label={t(slot.heatState === 'ready' ? 'griddle.heatReady' : slot.heatState === 'burnt' ? 'griddle.burnt' : 'griddle.heating')}
          />
          <span className="griddle-slot__oil" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="griddle-slot__steam" aria-hidden="true"><i /><i /><i /></span>
        </>
      )}
    </div>
  )
}
