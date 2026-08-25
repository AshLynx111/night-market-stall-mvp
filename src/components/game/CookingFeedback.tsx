import { useEffect, useRef, useState } from 'react'
import type { GriddleSlotState, KitchenState, SlotId } from '../../landscape/kitchen/types'
import { GameIcon } from './GameIcon'
import { useI18n } from '../../i18n/I18nProvider'

export type CookingFeedbackKind = 'place' | 'egg' | 'ready' | 'sauce' | 'cut' | 'roll' | 'pack'

interface SlotSnapshot {
  phase: GriddleSlotState['phase']
  heatState: GriddleSlotState['heatState']
  completedStepIds: string[]
  sauceStrokeCount: number
  cutCount: number
}

function snapshot(slot: GriddleSlotState): SlotSnapshot {
  return {
    phase: slot.phase,
    heatState: slot.heatState,
    completedStepIds: [...slot.completedStepIds],
    sauceStrokeCount: slot.sauceStrokeCount ?? 0,
    cutCount: slot.cutTargetIndices.length,
  }
}

export function detectCookingFeedback(previous: SlotSnapshot, current: SlotSnapshot): CookingFeedbackKind[] {
  const kinds: CookingFeedbackKind[] = []
  const addedSteps = current.completedStepIds.slice(previous.completedStepIds.length)
  if (addedSteps.some((step) => step === 'noodle' || step === 'second-noodle')) kinds.push('place')
  if (addedSteps.some((step) => step === 'egg' || step === 'second-egg')) kinds.push('egg')
  if (current.heatState === 'ready' && previous.heatState !== 'ready') kinds.push('ready')
  if (current.sauceStrokeCount > previous.sauceStrokeCount || addedSteps.includes('sauce')) kinds.push('sauce')
  if (current.cutCount > previous.cutCount) kinds.push('cut')
  if (current.phase === 'rolled' && previous.phase !== 'rolled') kinds.push('roll')
  if (current.phase === 'on-tray' && previous.phase !== 'on-tray') kinds.push('pack')
  return [...new Set(kinds)]
}

interface Cue { id: number; slotId: SlotId; kind: CookingFeedbackKind }

export function CookingFeedback({ slots }: { slots: KitchenState['slots'] }) {
  const { t } = useI18n()
  const previous = useRef(new Map(slots.map((slot) => [slot.id, snapshot(slot)])))
  const nextId = useRef(0)
  const timers = useRef<number[]>([])
  const [cues, setCues] = useState<Cue[]>([])

  useEffect(() => {
    const additions = slots.flatMap((slot) => {
      const current = snapshot(slot)
      const before = previous.current.get(slot.id) ?? current
      return detectCookingFeedback(before, current).map((kind) => ({ id: ++nextId.current, slotId: slot.id, kind }))
    })
    previous.current = new Map(slots.map((slot) => [slot.id, snapshot(slot)]))
    if (!additions.length) return
    setCues((current) => [...current, ...additions])
    additions.forEach((cue) => {
      timers.current.push(window.setTimeout(() => {
        setCues((current) => current.filter((candidate) => candidate.id !== cue.id))
      }, cue.kind === 'ready' ? 900 : 700))
    })
  }, [slots])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  return (
    <div className="cooking-feedback" aria-hidden="true">
      {cues.map((cue) => (
        <span className={`cooking-feedback__cue cooking-feedback__cue--${cue.slotId} is-${cue.kind}`} data-cooking-feedback={cue.kind} key={cue.id}>
          {(cue.kind === 'ready' || cue.kind === 'cut' || cue.kind === 'roll') && <GameIcon name={cue.kind === 'ready' ? 'heat' : cue.kind} />}
          <b>{t(`cooking.${cue.kind}`)}</b>
        </span>
      ))}
    </div>
  )
}
