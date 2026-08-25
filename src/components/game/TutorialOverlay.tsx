import { nextCutTargetIndex, tutorialGesturePath, tutorialSvgPath, type TutorialPathKind } from '../../landscape/kitchen/tutorialPaths'
import { tutorialStep, type TutorialStep } from '../../landscape/kitchen/tutorial'
import type { KitchenState } from '../../landscape/kitchen/types'
import { GameIcon } from './GameIcon'
import { useI18n } from '../../i18n/I18nProvider'
import type { TFunction, TranslationKey } from '../../i18n/core'

type TutorialHandKind = 'drag' | 'egg' | 'hot-dog' | 'scallion' | 'pack' | 'serve'

const HAND_FOR_STEP: Partial<Record<TutorialStep, TutorialHandKind>> = {
  noodle: 'drag', egg: 'egg', 'hot-dog': 'hot-dog', scallion: 'scallion', pack: 'pack', serve: 'serve',
}

export function tutorialShortInstruction(step: TutorialStep, sauceSelected = false) {
  const copy: Record<TutorialStep, string> = {
    'customer-arrival': '看看顾客的订单', noodle: '点面皮，或拖到铁板', egg: '点击鸡蛋', 'wait-egg': '等蛋液变金黄',
    'hot-dog': '点热狗，或拖到铁板', 'wait-hot-dog': '等热狗煎香', sauce: sauceSelected ? '左右刷两下' : '点击酱刷',
    scallion: '点葱花，或拖到铁板', cut: '沿虚线切三刀', roll: '向右滑动卷起', pack: '点击装盘', serve: '点餐盒，或拖给顾客', done: '第一份完成',
  }
  return copy[step]
}

function TutorialGestureCue({ kind, state, sauceSelected }: { kind: TutorialPathKind; state: KitchenState; sauceSelected: boolean }) {
  const { t } = useI18n()
  const slot = state.slots[0]
  const cutTargetIndex = nextCutTargetIndex(slot.cutTargetIndices)
  const points = tutorialGesturePath(kind, cutTargetIndex)
  return (
    <div className="tutorial-gesture-cue tutorial-gesture-cue--left hint-panel text-chip ui-text-chip" data-sauce-progress={kind === 'sauce' ? `${slot.sauceStrokeCount ?? 0}/2` : undefined} data-griddle-inner-area="left">
      <svg viewBox="0 0 1000 500" preserveAspectRatio="none" data-tutorial-path={kind} data-cut-target-index={kind === 'cut' ? cutTargetIndex : undefined} aria-hidden="true">
        {kind === 'sauce' ? <><path d={tutorialSvgPath(points.slice(0, 2))} /><path d={tutorialSvgPath(points.slice(2))} /></> : <path d={tutorialSvgPath(points)} />}
      </svg>
      <span>{localizedShortInstruction(t, kind, sauceSelected)}</span>
    </div>
  )
}

export function TutorialOverlay({ state, sauceSelected, showCompletion = false }: { state: KitchenState; sauceSelected: boolean; showCompletion?: boolean }) {
  const { t } = useI18n()
  const step = tutorialStep(state)
  const guided = step !== 'done'
  const hand = HAND_FOR_STEP[step]
  return (
    <>
      {guided && (step === 'sauce' || step === 'cut' || step === 'roll') ? (
        <TutorialGestureCue kind={step} state={state} sauceSelected={sauceSelected} />
      ) : guided && hand ? (
        <div className={`tutorial-hand tutorial-hand--${hand} tutorial-hand--slot-left${hand === 'serve' ? ' tutorial-hand--lane-left' : ''}`} data-tutorial-gesture={hand} aria-label={t('gesture.hint')}>
          <GameIcon name="hand" />
        </div>
      ) : null}
      {guided && (
        <aside className="guided-tutorial hint-panel text-chip ui-text-chip" data-tutorial-step={step} role="status" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">{localizedShortInstruction(t, step, sauceSelected)}</span>
          <span className="sr-only">{t(`tutorial.full.${step}` as TranslationKey)}</span>
        </aside>
      )}
      {showCompletion && <aside className="tutorial-completion-toast hint-panel text-chip ui-text-chip" role="status" aria-live="polite" aria-atomic="true">{t('tutorial.complete')}</aside>}
    </>
  )
}

function localizedShortInstruction(t: TFunction, step: TutorialStep, sauceSelected = false) {
  if (step === 'sauce') return t(sauceSelected ? 'tutorial.short.sauce.brush' : 'tutorial.short.sauce.pick')
  return t(`tutorial.short.${step}` as TranslationKey)
}
