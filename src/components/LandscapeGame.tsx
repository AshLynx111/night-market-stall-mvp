import { useEffect, useRef, useState } from 'react'
import homeScreen from '../assets/runtime/main-ui/home-screen-user-final.webp'
import daySelectScreen from '../assets/runtime/main-ui/day-select-user-final.webp'
import cleanKitchenScreen from '../assets/runtime/main-ui/night-market-clean-background.webp'
import expandedLiveKitchenScreen from '../assets/runtime/main-ui/kitchen-screen-live-expanded-clean.webp'
import summaryScreen from '../assets/runtime/main-ui/summary-screen-user-final.webp'
import settingsScreen from '../assets/runtime/main-ui/settings-screen-user-final.webp'
import settingsSliderCleanPatch from '../assets/runtime/main-ui/settings-slider-clean-patch.webp'
import menuBoard from '../assets/runtime/menu/menu-board.webp'
import celebrityArt from '../assets/runtime/events/day5-celebrity-event-key-art.webp'
import takeawayBag from '../assets/runtime/menu/takeaway-bag.webp'
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../game/audioSettings'
import { applyAudioSettings, unlockAndPlayBgm } from '../game/bgm'
import { setAudioEffectLevel } from '../game/audio'
import { createUiFeedback } from '../game/uiFeedback'
import { DAYS, RECIPES, availableIngredients, incomeForDelivery, starsForDay } from '../landscape/campaign'
import type { CookingStep, DayConfig, Recipe } from '../landscape/campaign'
import { useKitchenGame } from '../landscape/kitchen/useKitchenGame'
import { isKitchenDayComplete } from '../landscape/kitchen/progress'
import type { DeliveryRecord } from '../landscape/kitchen/types'
import {
  completeCampaignDay,
  highestPlayableDay,
  normalizeCampaignSave,
  type CampaignSave,
} from '../landscape/progression'
import { KitchenScene } from './game/KitchenScene'
import { GameplayHud } from './game/GameplayHud'
import { DeliveryFeedback, type DeliveryFeedbackValue } from './game/DeliveryFeedback'
import { GameIcon } from './game/GameIcon'
import { UpgradeCardIcon } from './game/UpgradeCardIcon'
import { AccessibleDialog } from './game/AccessibleDialog'
import { useGameplayShortcuts } from '../landscape/useGameplayShortcuts'
import { useGameplayViewport } from '../landscape/useGameplayViewport'
import { nextRetentionCue, retentionCueForDay } from '../landscape/dayRetention'
import { DayRetentionCue } from './game/DayRetentionCue'
import { useI18n } from '../i18n/I18nProvider'
import { observeKitchenTransition, type KitchenInteractionIntent } from '../analytics/gameplayObserver'
import {
  analyticsSessionElapsedMs,
  beginAnalyticsDayRun,
  setAnalyticsCheckpoint,
  setAnalyticsLocale,
  trackGameEvent,
} from '../analytics/tracker'
import { tutorialStep } from '../landscape/kitchen/tutorial'
import type { MistakeType } from '../analytics/events'
import { PlaytestFeedbackLink } from './playtest/PlaytestFeedbackLink'

type Screen = 'home' | 'settings' | 'select' | 'playing' | 'event' | 'summary'

const SAVE_KEY = 'night-market-campaign-v1'
export const GUIDED_TUTORIAL_KEY = 'night-market-guided-tutorial-v2'
const STAGE_ART = import.meta.glob('../assets/runtime/stages/*/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
const STAGE_NAMES: Record<Recipe['id'], string[]> = {
  classic: ['00-empty', '01-noodle', '02-egg', '03-hot-dog', '04-sauce', '05-scallion', '06-cut', '07-roll', '08-pack'],
  'big-eater': ['00-empty', '01-noodle', '02-egg', '03-second-noodle', '04-second-egg', '05-sauce', '06-scallion', '07-cut', '08-roll', '09-pack'],
  orleans: ['00-empty', '01-noodle', '02-egg', '03-orleans', '04-sauce', '05-scallion', '06-cut', '07-roll', '08-pack'],
  tenderloin: ['00-empty', '01-noodle', '02-egg', '03-turkey-noodle', '04-tenderloin', '05-sauce', '06-scallion', '07-cut', '08-roll', '09-pack'],
  signature: ['00-empty', '01-noodle', '02-egg', '03-turkey-noodle', '04-cheese', '05-corn', '06-sauce', '07-scallion', '08-cut', '09-roll', '10-pack'],
}

function readSave(): CampaignSave {
  try {
    return normalizeCampaignSave(JSON.parse(localStorage.getItem(SAVE_KEY) ?? ''))
  } catch {
    return normalizeCampaignSave(null)
  }
}

function readGuidedTutorialComplete() {
  try {
    return localStorage.getItem(GUIDED_TUTORIAL_KEY) === 'true'
  } catch {
    return false
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function starsText(count: number) {
  const safeCount = Number.isInteger(count) && count >= 0 && count <= 3 ? count : 0
  return `${'★'.repeat(safeCount)}${'☆'.repeat(3 - safeCount)}`
}

function KitchenDaySession({ day, dayRunId, save, paused, backgroundInert, eventOpen, musicEnabled, effectsEnabled, guidedTutorial, qaCelebrityPatienceMs, qaServedOrders, qaPatienceRatio, qaDeliveryFeedback, onHome, onMenu, onSound, onHelp, onOrderServed, onEvent, onResumeEvent, onTutorialComplete, onComplete }: {
  day: DayConfig
  dayRunId: string | null
  save: CampaignSave
  paused: boolean
  backgroundInert: boolean
  eventOpen: boolean
  musicEnabled: boolean
  effectsEnabled: boolean
  guidedTutorial: boolean
  qaCelebrityPatienceMs?: number
  qaServedOrders?: number
  qaPatienceRatio?: number
  qaDeliveryFeedback?: boolean
  onHome: () => void
  onMenu: () => void
  onSound: () => void
  onHelp: () => void
  onOrderServed: (delivery: DeliveryRecord) => void
  onEvent: () => void
  onResumeEvent: () => void
  onTutorialComplete: () => void
  onComplete: (qualities: number[], mistakes: number, dayElapsedMs: number, cash: number) => void
}) {
  const { t } = useI18n()
  const { state, dispatch } = useKitchenGame(
    day.day,
    day.day * 100,
    save.fireLevel * 3_000,
    qaServedOrders,
    guidedTutorial,
    qaPatienceRatio,
  )
  const creditedCount = useRef(0)
  const eventReported = useRef(false)
  const completionReported = useRef(false)
  const tutorialCompletionReported = useRef(false)
  const previousTutorialMode = useRef(state.tutorialMode)
  const previousAnalyticsState = useRef(state)
  const dayStartedAt = useRef(performance.now())
  const tutorialStartedAt = useRef<number | null>(guidedTutorial ? performance.now() : null)
  const firstOrderStartedAt = useRef<number | null>(null)
  const mistakeCounts = useRef(new Map<MistakeType, number>())
  const startingCash = useRef(save.coins)
  const pendingCelebrityInjection = useRef<{ patienceMs?: number } | null>(null)
  const nextDeliveryFeedbackId = useRef(0)
  const deliveryFeedbackTimer = useRef<number | null>(null)
  const [deliveryFeedback, setDeliveryFeedback] = useState<DeliveryFeedbackValue | null>(() => qaDeliveryFeedback
    ? { id: 1, income: 9, quality: 96 }
    : null)
  const { viewportRef, sceneScale, sceneInverseScale } = useGameplayViewport()
  const expandedRack = availableIngredients(day.day).length > 6
  const kitchenScreen = cleanKitchenScreen
  const rackBackground = expandedRack ? 'expanded-3x5' : 'approved-2x3'

  const elapsedSinceTutorialStart = () => Math.max(0, performance.now() - (tutorialStartedAt.current ?? performance.now()))

  const recordMistake = (mistakeType: MistakeType, stepId?: string, slotId?: 'left' | 'right') => {
    trackGameEvent('mistake_recorded', {
      day: day.day,
      mistake_type: mistakeType,
      ...(stepId ? { step_id: stepId } : {}),
      ...(slotId ? { slot_id: slotId } : {}),
    })
    const count = (mistakeCounts.current.get(mistakeType) ?? 0) + 1
    mistakeCounts.current.set(mistakeType, count)
    if (count === 3 && dayRunId) {
      trackGameEvent('repeated_mistake', { day: day.day, mistake_type: mistakeType, count: 3 }, {
        onceKey: `repeated-mistake:${dayRunId}:${mistakeType}`,
      })
    }
  }

  const reportTelemetryIntent = (intent: KitchenInteractionIntent) => {
    if (intent.kind === 'ingredient_selected') {
      trackGameEvent('ingredient_selected', {
        ingredient_id: intent.ingredientId,
        ...(intent.slotId ? { slot_id: intent.slotId } : {}),
      })
      if (!intent.accepted) recordMistake('ingredient', intent.stepId, intent.slotId)
      return
    }
    if (intent.kind === 'gesture_rejected') {
      recordMistake('gesture', intent.gestureId, intent.slotId)
      return
    }
    if (intent.kind === 'griddle_discarded') {
      trackGameEvent('griddle_discarded', {
        ...(intent.recipeId ? { recipe_id: intent.recipeId } : {}),
        slot_id: intent.slotId,
      })
      return
    }
    trackGameEvent('serve_attempted', {
      recipe_id: intent.recipeId,
      slot_id: intent.slotId,
      customer_id: intent.customerId,
    })
    if (!intent.accepted) {
      trackGameEvent('serve_failed', {
        recipe_id: intent.recipeId,
        slot_id: intent.slotId,
        customer_id: intent.customerId,
        reason: intent.reason ?? 'unknown',
      })
      if (intent.reason !== 'wrong_customer') recordMistake('serve', 'serve', intent.slotId)
    }
  }

  useEffect(() => {
    if (!dayRunId) return
    trackGameEvent('day_started', { day: day.day, guided_tutorial: guidedTutorial }, {
      onceKey: `day-started:${dayRunId}`,
    })
    setAnalyticsCheckpoint({
      screen: 'playing',
      day: day.day,
      tutorialStep: guidedTutorial ? tutorialStep(state) : undefined,
      ordersServed: state.servedQualities.length,
    })
    if (guidedTutorial) {
      tutorialStartedAt.current ??= performance.now()
      trackGameEvent('tutorial_started', { day: 1 }, { onceKey: `tutorial-started:${dayRunId}` })
      const step = tutorialStep(state)
      if (step !== 'done') {
        trackGameEvent('tutorial_step_viewed', {
          step,
          elapsed_since_tutorial_start_ms: elapsedSinceTutorialStart(),
        }, { onceKey: `tutorial-step-viewed:${dayRunId}:${step}` })
      }
    }
  }, [day.day, dayRunId, guidedTutorial])

  useEffect(() => {
    dispatch({ type: 'SET_PAUSED', paused })
  }, [dispatch, paused])

  useEffect(() => {
    const pending = pendingCelebrityInjection.current
    if (eventOpen || state.paused || !pending) return
    pendingCelebrityInjection.current = null
    dispatch({ type: 'INJECT_CELEBRITY', patienceMs: pending.patienceMs })
  }, [dispatch, eventOpen, state.paused])

  useEffect(() => {
    const previousMode = previousTutorialMode.current
    previousTutorialMode.current = state.tutorialMode
    if (previousMode === 'guided-first-order'
      && state.tutorialMode === 'complete'
      && !tutorialCompletionReported.current) {
      tutorialCompletionReported.current = true
      onTutorialComplete()
    }
  }, [onTutorialComplete, state.tutorialMode])

  useEffect(() => {
    if (!dayRunId || firstOrderStartedAt.current !== null) return
    const firstCustomer = state.customers.find((customer) => customer.presence === 'active')
    if (!firstCustomer) return
    firstOrderStartedAt.current = performance.now()
    trackGameEvent('first_order_started', {
      day: day.day,
      recipe_id: firstCustomer.order.recipeId,
    }, { onceKey: `first-order-started:${dayRunId}` })
  }, [day.day, dayRunId, state.customers])

  useEffect(() => {
    const previous = previousAnalyticsState.current
    previousAnalyticsState.current = state
    if (!dayRunId || previous === state) return
    const observations = observeKitchenTransition(previous, state)
    for (const observation of observations) {
      if (observation.kind === 'ingredient_placed') {
        trackGameEvent('ingredient_placed', {
          ingredient_id: observation.ingredientId,
          recipe_id: observation.recipeId,
          step_id: observation.stepId,
          slot_id: observation.slotId,
        })
      } else if (observation.kind === 'gesture_completed') {
        trackGameEvent('gesture_completed', {
          gesture_id: observation.gestureId,
          recipe_id: observation.recipeId,
          step_id: observation.stepId,
          slot_id: observation.slotId,
        })
      } else if (observation.kind === 'dish_packed') {
        trackGameEvent('dish_packed', { recipe_id: observation.recipeId, slot_id: observation.slotId })
      } else if (observation.kind === 'delivery_completed') {
        trackGameEvent('serve_succeeded', {
          recipe_id: observation.recipeId,
          slot_id: observation.slotId,
          customer_id: observation.customerId,
          quality: observation.quality,
        })
        trackGameEvent('first_order_completed', {
          day: day.day,
          recipe_id: observation.recipeId,
          duration_ms: Math.max(0, performance.now() - (firstOrderStartedAt.current ?? performance.now())),
          mistakes: state.mistakes,
          quality: observation.quality,
        }, { onceKey: `first-order-completed:${dayRunId}` })
      } else if (observation.kind === 'order_timeout') {
        trackGameEvent('order_timeout', {
          day: day.day,
          recipe_id: observation.recipeId,
          customer_id: observation.customerId,
        })
      } else if (observation.kind === 'mistake_recorded') {
        recordMistake(observation.mistakeType, observation.stepId, observation.slotId)
      } else {
        trackGameEvent('tutorial_step_completed', {
          step: observation.previousStep,
          elapsed_since_tutorial_start_ms: elapsedSinceTutorialStart(),
        }, { onceKey: `tutorial-step-completed:${dayRunId}:${observation.previousStep}` })
        if (observation.currentStep === 'done') {
          trackGameEvent('tutorial_completed', {
            elapsed_since_tutorial_start_ms: elapsedSinceTutorialStart(),
          }, { onceKey: `tutorial-completed:${dayRunId}` })
        } else {
          trackGameEvent('tutorial_step_viewed', {
            step: observation.currentStep,
            elapsed_since_tutorial_start_ms: elapsedSinceTutorialStart(),
          }, { onceKey: `tutorial-step-viewed:${dayRunId}:${observation.currentStep}` })
        }
      }
    }
    setAnalyticsCheckpoint({
      screen: eventOpen ? 'event' : 'playing',
      day: day.day,
      tutorialStep: state.tutorialMode === 'guided-first-order' ? tutorialStep(state) : undefined,
      ordersServed: state.servedQualities.length,
    })
  }, [day.day, dayRunId, eventOpen, state])

  useEffect(() => {
    while (creditedCount.current < state.deliveries.length) {
      const delivery = state.deliveries[creditedCount.current]
      onOrderServed(delivery)
      setDeliveryFeedback({
        id: ++nextDeliveryFeedbackId.current,
        income: incomeForDelivery(delivery.recipeId, delivery.quality, save.signLevel),
        quality: delivery.quality,
      })
      if (deliveryFeedbackTimer.current !== null) window.clearTimeout(deliveryFeedbackTimer.current)
      deliveryFeedbackTimer.current = window.setTimeout(() => setDeliveryFeedback(null), 1_000)
      creditedCount.current += 1
    }

    if (day.day === 5 && state.servedQualities.length >= 4 && !eventReported.current) {
      eventReported.current = true
      onEvent()
      return
    }

    if (isKitchenDayComplete(day, state) && !completionReported.current) {
      completionReported.current = true
      const finalCash = startingCash.current + state.deliveries.reduce((total, delivery) => (
        total + incomeForDelivery(delivery.recipeId, delivery.quality, save.signLevel)
      ), 0)
      onComplete(
        [...state.servedQualities],
        state.mistakes,
        Math.max(0, performance.now() - dayStartedAt.current),
        finalCash,
      )
    }
  }, [
    day.day,
    day.targetOrders,
    onComplete,
    onEvent,
    onOrderServed,
    state.celebrityServed,
    state.deliveries,
    state.mistakes,
    state.servedQualities,
    save.signLevel,
  ])

  useEffect(() => () => {
    if (deliveryFeedbackTimer.current !== null) window.clearTimeout(deliveryFeedbackTimer.current)
  }, [])

  return (
    <main
      className="game-screen ui-screen"
      style={{ '--game-ambient-bg': `url(${kitchenScreen})` } as React.CSSProperties}
      data-ui-screen={eventOpen ? 'event' : 'playing'}
      data-screen-art="kitchen"
      data-day={day.day}
      data-kitchen-tutorial-mode={state.tutorialMode}
      data-kitchen-customer-count={state.customers.length}
      inert={backgroundInert}
      aria-hidden={backgroundInert || undefined}
    >
      <div className="game-screen__safe-viewport" ref={viewportRef}>
        <div
          className="game-screen__logical"
          style={{
            '--game-bg': `url(${kitchenScreen})`,
            '--kitchen-live-bg': `url(${kitchenScreen})`,
            '--scene-scale': sceneScale,
            '--scene-inverse-scale': sceneInverseScale,
          } as React.CSSProperties}
        >
        <img
          className="game-screen__background"
          src={kitchenScreen}
          alt=""
          fetchPriority="high"
          aria-hidden="true"
          data-kitchen-live-plate
          data-kitchen-rack-background={rackBackground}
          data-kitchen-source="night-market-clean-background.png"
        />
        {expandedRack && (
          <img
            className="game-screen__background game-screen__background--expanded-rack"
            src={expandedLiveKitchenScreen}
            alt=""
            aria-hidden="true"
            data-kitchen-expanded-rack-overlay
          />
        )}
        <GameplayHud
          day={day.day}
          coins={save.coins}
          served={state.servedQualities.length}
          target={day.targetOrders}
          sound={musicEnabled}
          onHome={onHome}
          onPause={onMenu}
          onSound={onSound}
        />
        <KitchenScene state={state} dispatch={dispatch} soundEnabled={effectsEnabled} onTelemetryIntent={reportTelemetryIntent} />
        <DeliveryFeedback feedback={deliveryFeedback} held={qaDeliveryFeedback} />
        <button className="help-fab" onClick={onHelp} aria-label={t('game.help')} aria-keyshortcuts="H"><GameIcon name="help" /></button>
        {eventOpen && (
          <div className="event-screen event-screen--overlay">
            <div className="event-screen__art" style={{ backgroundImage: `url(${celebrityArt})` }} />
            <section className="dialogue-box paper-panel ui-text-surface ui-text-surface--paper">
              <span className="event-tag">{t('event.day5Tag')}</span>
              <h1>{t('event.day5Title')}</h1>
              <p>{t('event.day5Quote')}</p>
              <div className="whisper">{t('event.day5Whisper')}</div>
              <button
                className="primary-button"
                onClick={() => {
                  pendingCelebrityInjection.current = { patienceMs: qaCelebrityPatienceMs }
                  onResumeEvent()
                }}
              >{t('event.day5Action')}</button>
            </section>
          </div>
        )}
        </div>
      </div>
      <div className="rotate-device"><GameIcon name="roll" /><b>{t('rotate.prompt')}</b></div>
    </main>
  )
}

function FoodStage({ recipe, completedCount, currentStep, repeatProgress = 0 }: {
  recipe: Recipe
  completedCount: number
  currentStep?: CookingStep
  repeatProgress?: number
}) {
  const { t, domain } = useI18n()
  const stageNames = STAGE_NAMES[recipe.id]
  const stageIndex = clamp(completedCount, 0, stageNames.length - 1)
  const stageName = stageNames[stageIndex]
  const stagePath = `../assets/runtime/stages/${recipe.id}/${recipe.id}-${stageName}.webp`
  const completeStageArt = STAGE_ART[stagePath]
  if (completeStageArt) return <img className="stage-complete-art" src={completeStageArt} alt={t('game.stageAlt', { recipe: domain.recipeText(recipe.id, 'shortName'), stage: stageIndex + 1 })} />
  const applied = recipe.steps.slice(0, completedCount)
  const appliedIds = applied.map((step) => step.id)
  const isPacked = appliedIds.includes('pack')
  const isRolled = appliedIds.includes('roll')
  const hasCut = appliedIds.includes('cut') || currentStep?.id === 'cut'
  const partialSauce = currentStep?.id === 'sauce' ? repeatProgress : 0

  if (completedCount === 0) {
    return <div className="drop-hint hint-panel ui-text-surface ui-text-surface--paper"><b>{t('game.dropIngredient', { ingredient: currentStep ? domain.stepText(currentStep.id, 'label') : domain.ingredientText('noodle') })}</b><small>{t('game.clickIngredient')}</small></div>
  }

  if (isPacked) return <img className="stage-packed" src={takeawayBag} alt={t('game.packedAlt')} />
  if (isRolled) return <img className="stage-rolled" src={recipe.image} alt={t('game.rolledAlt')} />

  return (
    <div className="food-stage" aria-label={t('game.stageAria', { count: completedCount })}>
      {applied.map((step, index) => {
        if (!step.asset || ['roll', 'pack', 'cut'].includes(step.id)) return null
        return <img className={`stage-layer stage-layer--${step.id}`} src={step.asset} alt={domain.stepText(step.id, 'label')} key={`${step.id}-${index}`} />
      })}
      {partialSauce > 0 && currentStep?.asset && Array.from({ length: partialSauce }).map((_, index) => (
        <img className={`stage-layer stage-layer--sauce stage-layer--partial-${index + 1}`} src={currentStep.asset} alt={t('game.saucingAlt')} key={`partial-sauce-${index}`} />
      ))}
      {hasCut && <div className="stage-cuts">{[0, 1, 2].map((cut) => <i className={appliedIds.includes('cut') || cut < repeatProgress ? 'done' : ''} key={cut} />)}</div>}
    </div>
  )
}

function UpgradeShop({ save, onBuy }: { save: CampaignSave; onBuy: (type: 'fire' | 'sign') => void }) {
  const { t } = useI18n()
  const firePrice = [40, 80][save.fireLevel]
  const signPrice = [60, 110][save.signLevel]
  return (
    <section className="upgrade-shop" aria-label={t('upgrade.shopLabel')}>
      <div className="upgrade-shop__funds ui-text-surface ui-text-surface--wood" data-upgrade-funds data-dynamic-mask="wood">
        <span className="upgrade-shop__icon upgrade-shop__icon--funds" aria-hidden="true"><UpgradeCardIcon kind="funds" /></span>
        <span>{t('upgrade.funds')}</span><b>¥ {save.coins}</b>
      </div>
      <button aria-label={t('upgrade.fire')} disabled={save.fireLevel >= 2 || save.coins < (firePrice ?? Infinity)} onClick={() => onBuy('fire')}>
        <span className="upgrade-shop__icon upgrade-shop__icon--fire" aria-hidden="true"><UpgradeCardIcon kind="fire" /></span>
        <span className="upgrade-shop__copy ui-text-surface ui-text-surface--wood" data-dynamic-mask="wood"><b>{t('upgrade.fireLevel', { level: Math.min(2, save.fireLevel + 1) })}</b><small>{firePrice ? t('upgrade.fireBenefit', { price: firePrice }) : t('common.maxLevel')}</small></span>
      </button>
      <button aria-label={t('upgrade.sign')} disabled={save.signLevel >= 2 || save.coins < (signPrice ?? Infinity)} onClick={() => onBuy('sign')}>
        <span className="upgrade-shop__icon upgrade-shop__icon--sign" aria-hidden="true"><UpgradeCardIcon kind="sign" /></span>
        <span className="upgrade-shop__copy ui-text-surface ui-text-surface--wood" data-dynamic-mask="wood"><b>{t('upgrade.signLevel', { level: Math.min(2, save.signLevel + 1) })}</b><small>{signPrice ? t('upgrade.signBenefit', { price: signPrice }) : t('common.maxLevel')}</small></span>
      </button>
    </section>
  )
}

export function LandscapeGame() {
  const { locale, t, domain } = useI18n()
  const query = new URLSearchParams(window.location.search)
  const previewDayNumber = Number(query.get('playDay'))
  const qaFixturesEnabled = import.meta.env.DEV
  const previewDay = qaFixturesEnabled && previewDayNumber >= 1 && previewDayNumber <= 6 ? DAYS[previewDayNumber - 1] : null
  const qaScreen = qaFixturesEnabled ? query.get('qaScreen') : null
  const qaCelebrityPatienceMs = qaFixturesEnabled
    && Number.isFinite(Number(query.get('qaCelebrityPatienceMs')))
    && Number(query.get('qaCelebrityPatienceMs')) > 0
    ? Number(query.get('qaCelebrityPatienceMs'))
    : undefined
  const qaServedOrders = qaFixturesEnabled
    && Number.isFinite(Number(query.get('qaServedOrders')))
    && Number(query.get('qaServedOrders')) > 0
    ? Number(query.get('qaServedOrders'))
    : undefined
  const qaPatienceRatio = qaFixturesEnabled
    && Number.isFinite(Number(query.get('qaPatienceRatio')))
    && Number(query.get('qaPatienceRatio')) > 0
    && Number(query.get('qaPatienceRatio')) <= 1
    ? Number(query.get('qaPatienceRatio'))
    : undefined
  const qaDeliveryFeedback = qaFixturesEnabled && query.get('qaDeliveryFeedback') === '1'
  const initialScreen: Screen = qaScreen === 'event' && previewDay?.day === 5
    ? 'event'
    : qaScreen === 'summary' && previewDay
      ? 'summary'
      : qaScreen === 'select'
        ? 'select'
        : previewDay ? 'playing' : 'home'
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [save, setSave] = useState<CampaignSave>(readSave)
  const [day, setDay] = useState<DayConfig>(previewDay ?? DAYS[0])
  const [qualities, setQualities] = useState<number[]>(initialScreen === 'summary' && previewDay
    ? Array.from({ length: previewDay.targetOrders }, () => 92)
    : [])
  const [mistakes, setMistakes] = useState(0)
  const [celebrityDone, setCelebrityDone] = useState(initialScreen === 'summary' && previewDay?.day === 5)
  const [showMenu, setShowMenu] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)
  const audioSettingsRef = useRef(audioSettings)
  const [sessionId, setSessionId] = useState(1)
  const [dayRunId, setDayRunId] = useState<string | null>(null)
  const [guidedTutorialComplete, setGuidedTutorialComplete] = useState(readGuidedTutorialComplete)
  const previousTrackedScreen = useRef<Screen | null>(null)
  const served = qualities.length
  const average = served ? Math.round(qualities.reduce((sum, value) => sum + value, 0) / served) : 100
  const uiFeedback = createUiFeedback(audioSettings.master * audioSettings.effects > 0)
  const dialogOpen = showMenu || showHelp || showAbandonConfirm

  useGameplayShortcuts({
    enabled: screen === 'playing',
    dialogOpen,
    onPause: () => {
      uiFeedback.tap()
      trackGameEvent('pause_opened', { day: day.day })
      setShowMenu(true)
    },
    onHelp: () => {
      uiFeedback.tap()
      trackGameEvent('help_opened', { screen: 'playing', day: day.day })
      setShowHelp(true)
    },
    onMusic: () => {
      uiFeedback.tap()
      setAudioSettings((current) => ({ ...current, musicMuted: !current.musicMuted }))
    },
  })

  const stageRequest = new URLSearchParams(window.location.search).get('renderStage')
  if (stageRequest) {
    const [recipeId, countText] = stageRequest.split(':')
    const renderRecipe = RECIPES[recipeId as keyof typeof RECIPES] ?? RECIPES.classic
    const completedCount = clamp(Number(countText) || 0, 0, renderRecipe.steps.length)
    return (
      <main className="stage-export">
        <div className="stage-export__griddle">
          <FoodStage recipe={renderRecipe} completedCount={completedCount} currentStep={renderRecipe.steps[completedCount]} />
        </div>
      </main>
    )
  }

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save))
    } catch {
      // Storage can be denied in private or embedded browser contexts.
    }
  }, [save])

  useEffect(() => {
    audioSettingsRef.current = audioSettings
    saveAudioSettings(audioSettings)
    applyAudioSettings(audioSettings)
    setAudioEffectLevel(audioSettings.master * audioSettings.effects)
  }, [audioSettings])

  useEffect(() => {
    setAnalyticsLocale(locale)
  }, [locale])

  useEffect(() => {
    setAnalyticsCheckpoint({
      screen,
      day: screen === 'playing' || screen === 'event' || screen === 'summary' ? day.day : undefined,
      ...(screen === 'summary' ? { ordersServed: served } : {}),
    })
    if (previousTrackedScreen.current === screen) return
    previousTrackedScreen.current = screen
    if (screen === 'home') trackGameEvent('home_viewed', {})
    if (screen === 'summary') {
      const summaryStars = starsForDay(qualities, mistakes)
      trackGameEvent('summary_viewed', {
        day: day.day,
        orders_served: served,
        average_quality: average,
        mistakes,
        stars: summaryStars,
        cash: save.coins,
      }, { onceKey: `summary-viewed:${dayRunId ?? `preview-${day.day}`}` })
    }
  }, [average, day.day, dayRunId, mistakes, qualities, save.coins, screen, served])

  useEffect(() => {
    const unlock = (event: PointerEvent | KeyboardEvent) => {
      if (!event.isTrusted) return
      void unlockAndPlayBgm(audioSettingsRef.current)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const openAbandonConfirm = () => {
    uiFeedback.tap()
    setShowAbandonConfirm(true)
  }

  const continueCurrentSession = () => {
    setShowAbandonConfirm(false)
  }

  const startDay = (nextDay: DayConfig) => {
    if (nextDay.day > highestPlayableDay(save)) {
      uiFeedback.upgrade(false)
      return
    }
    uiFeedback.success()
    const nextDayRunId = beginAnalyticsDayRun(nextDay.day)
    setSessionId((value) => value + 1)
    setDayRunId(nextDayRunId)
    setDay(nextDay)
    setQualities([])
    setMistakes(0)
    setCelebrityDone(false)
    setScreen('playing')
  }

  const finishDay = (nextQualities: number[], nextMistakes: number, dayElapsedMs: number, cash: number) => {
    const stars = starsForDay(nextQualities, nextMistakes)
    const nextAverage = nextQualities.length
      ? Math.round(nextQualities.reduce((sum, value) => sum + value, 0) / nextQualities.length)
      : 100
    trackGameEvent('day_completed', {
      day: day.day,
      session_elapsed_ms: analyticsSessionElapsedMs(),
      day_elapsed_ms: dayElapsedMs,
      orders_served: nextQualities.length,
      average_quality: nextAverage,
      mistakes: nextMistakes,
      stars,
      cash,
    }, { onceKey: `day-completed:${dayRunId ?? `preview-${day.day}`}` })
    setQualities(nextQualities)
    setMistakes(nextMistakes)
    setSave((current) => completeCampaignDay(current, day.day, stars))
    setScreen('summary')
  }

  const buyUpgrade = (type: 'fire' | 'sign') => {
    const levelKey = type === 'fire' ? 'fireLevel' : 'signLevel'
    const costs = type === 'fire' ? [40, 80] : [60, 110]
    const level = save[levelKey]
    const cost = costs[level]
    const accepted = level < 2 && cost !== undefined && save.coins >= cost
    uiFeedback.upgrade(accepted)
    setSave((current) => {
      const level = current[levelKey]
      const cost = costs[level]
      if (level >= 2 || cost === undefined || current.coins < cost) return current
      return { ...current, coins: current.coins - cost, [levelKey]: level + 1 }
    })
  }

  const startCelebrity = () => {
    setCelebrityDone(true)
    setScreen('playing')
  }

  const toggleMusic = () => {
    uiFeedback.tap()
    setAudioSettings((current) => ({ ...current, musicMuted: !current.musicMuted }))
  }

  const setAudioLevel = (key: 'master' | 'music' | 'effects', value: number) => {
    setAudioSettings((current) => ({ ...current, [key]: value }))
  }

  const openScreen = (nextScreen: Screen) => {
    uiFeedback.tap()
    setScreen(nextScreen)
  }

  const openMenu = () => {
    uiFeedback.tap()
    if (screen === 'playing') trackGameEvent('pause_opened', { day: day.day })
    setShowMenu(true)
  }

  const closeMenu = () => {
    uiFeedback.tap()
    setShowMenu(false)
  }

  if (screen === 'home') {
    return (
      <main className="home-screen home-screen--illustrated ui-screen" data-screen-art="home" data-ui-screen="home" style={{ '--home-bg': `url(${homeScreen})` } as React.CSSProperties}>
        <div className="home-screen__plate">
          <img className="home-screen__art" src={homeScreen} alt={t('home.imageAlt')} fetchPriority="high" />
          {locale === 'en' && <span className="profile-card__locale-label ui-text-surface ui-text-surface--paper" data-locale-art-text aria-hidden="true">{t('home.profileLabel')}</span>}
          {locale === 'en' && (
            <div className="home-screen__locale-title ui-text-surface ui-text-surface--wood" data-locale-art-text aria-hidden="true">
              <strong>{t('home.titlePrimary')}</strong>
              <span>{t('home.titleSecondary')}</span>
            </div>
          )}
          <nav className="home-screen__hotspots" aria-label={t('home.menuLabel')}>
            <button className="home-hotspot home-hotspot--start" aria-label={t('home.start')} onClick={() => { trackGameEvent('start_game_clicked', { day: 1 }); startDay(DAYS[0]) }}>{locale === 'en' && <span className="home-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('home.start')}</span>}<span className="sr-only">{t('home.start')}</span></button>
            <button className="home-hotspot home-hotspot--continue" aria-label={t('home.continue')} onClick={() => { const nextDay = DAYS[highestPlayableDay(save) - 1]; trackGameEvent('continue_clicked', { day: nextDay.day }); startDay(nextDay) }}>{locale === 'en' && <span className="home-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('home.continue')}</span>}<span className="sr-only">{t('home.continue')}</span></button>
            <button className="home-hotspot home-hotspot--settings" aria-label={t('home.openSettings')} onClick={() => { trackGameEvent('settings_opened', { source: 'home' }); openScreen('settings') }}>{locale === 'en' && <span className="home-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('home.settings')}</span>}<span className="sr-only">{t('home.settings')}</span></button>
            <button className="home-hotspot home-hotspot--collection" aria-label={t('home.openCollection')} onClick={openMenu}>{locale === 'en' && <span className="home-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('home.collection')}</span>}<span className="sr-only">{t('home.collection')}</span></button>
            <button className="home-hotspot home-hotspot--achievements" aria-label={t('home.openAchievements')} onClick={() => { trackGameEvent('day_select_opened', { source: 'home' }); openScreen('select') }}>{locale === 'en' && <span className="home-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('home.achievements')}</span>}<span className="sr-only">{t('home.selectDays')}</span></button>
          </nav>
          <button
            className="home-screen__music-toggle"
            type="button"
            aria-label={t('audio.music')}
            aria-pressed={audioSettings.musicMuted}
            onClick={toggleMusic}
          ><span className="sr-only">{audioSettings.musicMuted ? t('audio.unmute') : t('audio.mute')}</span></button>
        </div>
        {showMenu && <MenuModal onClose={closeMenu} />}
      </main>
    )
  }

  if (screen === 'settings') {
    return (
      <main className="settings-screen ui-screen" data-ui-screen="settings" aria-label={t('settings.screenLabel')}>
        <div className="settings-screen__plate">
          <img
            className="settings-screen__art"
            data-screen-art="settings"
            src={settingsScreen}
            alt={t('settings.imageAlt')}
            fetchPriority="high"
          />
          <img
            className="settings-screen__rail-clean-patch"
            src={settingsSliderCleanPatch}
            alt=""
            aria-hidden="true"
          />
          {locale === 'en' && <span className="profile-card__locale-label ui-text-surface ui-text-surface--paper" data-locale-art-text aria-hidden="true">{t('home.profileLabel')}</span>}
          {locale === 'en' && (
            <div className="settings-screen__game-title ui-text-surface ui-text-surface--wood" data-locale-art-text aria-hidden="true">
              <strong>{t('home.titlePrimary')}</strong>
              <span>{t('home.titleSecondary')}</span>
            </div>
          )}
          <div className="settings-screen__controls settings-text-region">
            <label className="settings-slider settings-slider--master">
              <span className="sr-only">{t('settings.master')}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.master}
                data-level={audioSettings.master.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.master * 100}%` } as React.CSSProperties}
                aria-label={t('settings.masterAria')}
                onChange={(event) => setAudioLevel('master', Number(event.currentTarget.value))}
              />
            </label>
            <label className="settings-slider settings-slider--music">
              <span className="sr-only">{t('settings.music')}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.music}
                data-level={audioSettings.music.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.music * 100}%` } as React.CSSProperties}
                aria-label={t('settings.musicAria')}
                onChange={(event) => setAudioLevel('music', Number(event.currentTarget.value))}
              />
            </label>
            <label className="settings-slider settings-slider--effects">
              <span className="sr-only">{t('settings.effects')}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.effects}
                data-level={audioSettings.effects.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.effects * 100}%` } as React.CSSProperties}
                aria-label={t('settings.effectsAria')}
                onChange={(event) => setAudioLevel('effects', Number(event.currentTarget.value))}
              />
            </label>
          </div>
          {locale === 'en' && <div className="settings-screen__locale-copy" data-locale-art-text aria-hidden="true">
            <strong>{t('settings.title')}</strong>
            <span className="settings-screen__locale-label settings-screen__locale-label--master">{t('settings.master')}</span>
            <span className="settings-screen__locale-label settings-screen__locale-label--music">{t('settings.music')}</span>
            <span className="settings-screen__locale-label settings-screen__locale-label--effects">{t('settings.effects')}</span>
          </div>}
          <button
            className="settings-screen__music-toggle"
            type="button"
            aria-label={t('audio.music')}
            aria-pressed={audioSettings.musicMuted}
            onClick={toggleMusic}
          ><span className="sr-only">{audioSettings.musicMuted ? t('audio.unmute') : t('audio.mute')}</span></button>
          <button className="settings-screen__return" type="button" aria-label={t('common.backHome')} onClick={() => openScreen('home')}>
            {locale === 'en' && <span className="settings-screen__return-label" data-locale-art-text aria-hidden="true">{t('common.backHome')}</span>}
            <span className="sr-only">{t('common.backHome')}</span>
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'select') {
    const playableDay = highestPlayableDay(save)
    const campaignComplete = DAYS.every((item) => (save.bestStars[item.day] ?? 0) > 0)
    const currentRetentionDay = campaignComplete ? DAYS.length : playableDay
    const currentRetentionCue = domain.retentionText(retentionCueForDay(currentRetentionDay))
    return (
      <main className="select-screen ui-screen" data-screen-art="select" data-ui-screen="select" style={{ '--home-bg': `url(${daySelectScreen})` } as React.CSSProperties}>
        <div className="select-screen__plate">
          <img className="select-screen__art" src={daySelectScreen} alt={t('select.imageAlt')} fetchPriority="high" />
          <div className="select-screen__controls">
            {locale === 'en' && <div className="select-screen__locale-title ui-text-surface ui-text-surface--wood" data-locale-art-text aria-hidden="true"><strong>{t('select.title')}</strong><span>{t('select.subtitle')}</span></div>}
            <button className="select-hotspot select-hotspot--back" type="button" aria-label={t('common.backHome')} onClick={() => openScreen('home')}>{locale === 'en' && <span className="select-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('common.back')}</span>}<span className="sr-only">{t('common.backHome')}</span></button>
            <button className="select-hotspot select-hotspot--menu" type="button" aria-label={t('select.openMenu')} onClick={openMenu}>{locale === 'en' && <span className="select-hotspot__locale-label" data-locale-art-text aria-hidden="true">{t('select.menu')}</span>}<span className="sr-only">{t('select.openMenu')}</span></button>
            <section className="day-grid" aria-label={t('select.daysLabel')}>
              {DAYS.map((item) => {
                const locked = item.day > playableDay
                const currentTarget = !locked && item.day === currentRetentionDay
                const localizedDay = {
                  title: domain.dayText(item.day, 'title'),
                  story: domain.dayText(item.day, 'story'),
                  goal: domain.dayText(item.day, 'goal'),
                }
                const currentHook = campaignComplete ? t('select.allComplete') : currentRetentionCue.shortHook
                const accessibleLabel = locked
                  ? t('select.lockedAria', { day: item.day })
                  : currentTarget
                    ? t('select.enterCurrentDay', { day: item.day, title: localizedDay.title, goal: localizedDay.goal, hook: currentHook })
                    : t('select.enterDay', { day: item.day, title: localizedDay.title })
                return (
                  <button
                    className={`day-card day-hotspot text-panel-role--day-card day-card--${item.day}${locked ? ' is-locked' : ''}`}
                    key={item.day}
                    disabled={locked}
                    aria-label={accessibleLabel}
                    onClick={() => startDay(item)}
                  >
                    {locale === 'en' && <span className="day-card__locale-copy ui-text-surface ui-text-surface--paper" data-locale-art-text aria-hidden="true">
                      <small>{t('select.dayLabel', { day: item.day })}</small>
                      <b>{localizedDay.title}</b>
                      <span>{localizedDay.story}</span>
                      <em>{t('select.goal', { goal: localizedDay.goal })}</em>
                    </span>}
                    <span className="day-card__stars day-hotspot__stars" data-dynamic-mask="parchment" aria-hidden="true">{starsText(save.bestStars[item.day] ?? 0)}</span>
                    {(locked || currentTarget) && (
                      <span
                        className="day-hotspot__status day-hotspot__status--mask"
                        data-dynamic-mask="parchment"
                        data-current-day-hook={currentTarget ? true : undefined}
                        aria-hidden={currentTarget ? undefined : true}
                      >
                        {locked && <><span className="day-card__lock" aria-hidden="true"><GameIcon name="lock" /></span>{t('select.locked')}</>}
                        {currentTarget && currentHook}
                      </span>
                    )}
                  </button>
                )
              })}
            </section>
            <UpgradeShop save={save} onBuy={buyUpgrade} />
          </div>
        </div>
        {showMenu && <MenuModal onClose={closeMenu} />}
      </main>
    )
  }

  if (screen === 'summary') {
    const stars = starsForDay(qualities, mistakes)
    const nextCueModel = nextRetentionCue(day.day)
    const nextCue = nextCueModel ? domain.retentionText(nextCueModel) : null
    const localizedDay = {
      title: domain.dayText(day.day, 'title'),
      story: domain.dayText(day.day, 'story'),
      goal: domain.dayText(day.day, 'goal'),
    }
    return (
      <main className="summary-screen ui-screen" data-screen-art="summary" data-ui-screen="summary" style={{ '--home-bg': `url(${summaryScreen})` } as React.CSSProperties}>
        <div className="summary-screen__plate">
          <img className="summary-screen__art" src={summaryScreen} alt={t('summary.imageAlt')} fetchPriority="high" />
          {locale === 'en' && <div className="summary-screen__locale-heading ui-text-surface ui-text-surface--wood" data-locale-art-text aria-hidden="true">{t('summary.heading')}</div>}
          <section className="summary-card">
            <h1 className="summary-title ui-text-surface ui-text-surface--paper" data-dynamic-mask="parchment">{t('summary.shiftComplete', { title: localizedDay.title })}</h1>
            <div className="summary-stars ui-text-surface ui-text-surface--paper" data-dynamic-mask="parchment" aria-label={t('summary.starsAria', { stars })}>{starsText(stars)}</div>
            <p className="summary-message ui-text-surface ui-text-surface--paper" data-dynamic-mask="parchment">{t(stars === 3 ? 'summary.message3' : stars === 2 ? 'summary.message2' : 'summary.message1')}</p>
            <DayRetentionCue cue={nextCueModel} />
            <div className="summary-stats" aria-label={t('summary.statsLabel')}>
              <div className="stat-card ui-text-surface ui-text-surface--paper"><b className="summary-stat__value" data-dynamic-mask="parchment">{served}</b>{locale === 'en' && <span className="summary-stat__label" data-locale-art-text aria-hidden="true">{t('summary.orders')}</span>}<span className="sr-only">{t('summary.orders')}</span></div>
              <div className="stat-card ui-text-surface ui-text-surface--paper"><b className="summary-stat__value" data-dynamic-mask="parchment">{average}%</b>{locale === 'en' && <span className="summary-stat__label" data-locale-art-text aria-hidden="true">{t('summary.satisfaction')}</span>}<span className="sr-only">{t('summary.satisfaction')}</span></div>
              <div className="stat-card ui-text-surface ui-text-surface--paper"><b className="summary-stat__value" data-dynamic-mask="parchment">{mistakes}</b>{locale === 'en' && <span className="summary-stat__label" data-locale-art-text aria-hidden="true">{t('summary.mistakes')}</span>}<span className="sr-only">{t('summary.mistakes')}</span></div>
              <div className="stat-card ui-text-surface ui-text-surface--paper"><b className="summary-stat__value" data-dynamic-mask="parchment">¥{save.coins}</b>{locale === 'en' && <span className="summary-stat__label" data-locale-art-text aria-hidden="true">{t('summary.coins')}</span>}<span className="sr-only">{t('summary.coins')}</span></div>
            </div>
            {day.day === 5 && celebrityDone && <div className="buzz-note ui-text-chip">{t('summary.celebrityBuzz')}</div>}
            <UpgradeShop save={save} onBuy={buyUpgrade} />
            <div className="summary-actions">
              <button type="button" aria-label={t('summary.playAgain')} onClick={() => { trackGameEvent('play_again_clicked', { day: day.day }); startDay(day) }}><span>{t('summary.playAgain')}</span></button>
              <button type="button" aria-label={nextCue ? t('summary.nextDayAria', { title: nextCue.title }) : t('summary.backSelect')} onClick={() => {
                if (nextCue) {
                  trackGameEvent('next_day_clicked', { from_day: day.day, next_day: day.day + 1 })
                  startDay(DAYS[day.day])
                } else {
                  trackGameEvent('back_to_day_select_clicked', { from_day: day.day })
                  trackGameEvent('day_select_opened', { source: 'summary' })
                  openScreen('select')
                }
              }}><span>{nextCue ? t('summary.nextDay', { title: nextCue.title }) : t('summary.backSelect')}</span></button>
            </div>
            <PlaytestFeedbackLink day={day.day} />
          </section>
        </div>
      </main>
    )
  }

  return (
    <>
      <KitchenDaySession
        key={`${day.day}-${sessionId}`}
        day={day}
        dayRunId={dayRunId}
        save={save}
        paused={screen === 'event' || showMenu || showHelp || showAbandonConfirm}
        backgroundInert={dialogOpen}
        eventOpen={screen === 'event'}
        musicEnabled={!audioSettings.musicMuted}
        effectsEnabled={audioSettings.master * audioSettings.effects > 0}
        guidedTutorial={day.day === 1 && !guidedTutorialComplete}
        qaCelebrityPatienceMs={qaCelebrityPatienceMs}
        qaServedOrders={sessionId === 1 ? qaServedOrders : undefined}
        qaPatienceRatio={qaPatienceRatio}
        qaDeliveryFeedback={qaDeliveryFeedback}
        onHome={openAbandonConfirm}
        onMenu={openMenu}
        onSound={toggleMusic}
        onHelp={() => {
          uiFeedback.tap()
          trackGameEvent('help_opened', { screen: 'playing', day: day.day })
          setShowHelp(true)
        }}
        onOrderServed={(delivery) => {
          const income = incomeForDelivery(delivery.recipeId, delivery.quality, save.signLevel)
          setSave((current) => ({ ...current, coins: current.coins + income }))
        }}
        onEvent={() => setScreen('event')}
        onResumeEvent={startCelebrity}
        onTutorialComplete={() => {
          if (guidedTutorialComplete) return
          try {
            localStorage.setItem(GUIDED_TUTORIAL_KEY, 'true')
          } catch {
            // Completion still applies for this mounted campaign when storage is unavailable.
          }
          setGuidedTutorialComplete(true)
        }}
        onComplete={finishDay}
      />
      {showMenu && <MenuModal onClose={closeMenu} />}
      {showHelp && <HelpModal onClose={() => {
        uiFeedback.tap()
        setShowHelp(false)
      }} />}
      {showAbandonConfirm && (
        <AbandonModal
          onContinue={continueCurrentSession}
          onAbandon={() => {
            setShowAbandonConfirm(false)
            setShowMenu(false)
            setShowHelp(false)
            openScreen('select')
          }}
        />
      )}
    </>
  )
}

function AbandonModal({ onContinue, onAbandon }: { onContinue: () => void; onAbandon: () => void }) {
  const { t } = useI18n()
  return (
    <AccessibleDialog label={t('modal.abandonLabel')} className="abandon-modal paper-panel ui-text-surface ui-text-surface--paper" onClose={onContinue}>
        <h2>{t('modal.abandonTitle')}</h2>
        <p>{t('modal.abandonBody')}</p>
        <div>
          <button className="secondary-button" onClick={onContinue}>{t('modal.continue')}</button>
          <button className="primary-button" onClick={onAbandon}>{t('modal.abandon')}</button>
        </div>
    </AccessibleDialog>
  )
}

function MenuModal({ onClose }: { onClose: () => void }) {
  const { locale, t, domain } = useI18n()
  return (
    <AccessibleDialog label={t('modal.menuLabel')} className="menu-modal paper-panel ui-text-surface ui-text-surface--paper" onClose={onClose}>
        <button className="modal-close" onClick={onClose} aria-label={t('modal.closeMenu')}><GameIcon name="close" /></button>
        {locale === 'zh-CN' ? <img src={menuBoard} alt={t('modal.menuAlt')} /> : (
          <section className="menu-modal__localized ui-text-surface ui-text-surface--paper" aria-label={t('modal.menuAlt')}>
            <header><small>{t('modal.menuUnlock')}</small><h2>{t('modal.menuTitle')}</h2></header>
            <div>{Object.values(RECIPES).map((recipe) => (
              <article key={recipe.id}>
                <img src={recipe.image} alt="" aria-hidden="true" />
                <span><b>{domain.recipeText(recipe.id, 'name')}</b><small>¥{recipe.price}</small></span>
              </article>
            ))}</div>
          </section>
        )}
        <p>{t('modal.menuCaption')}</p>
    </AccessibleDialog>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <AccessibleDialog label={t('modal.helpLabel')} className="help-modal paper-panel ui-text-surface ui-text-surface--paper" onClose={onClose}>
        <button className="modal-close" onClick={onClose} aria-label={t('modal.closeHelp')}><GameIcon name="close" /></button>
        <span className="help-modal__icon" aria-hidden="true"><GameIcon name="heat" /></span>
        <h2>{t('modal.helpTitle')}</h2>
        <div><b>1</b><p>{t('modal.help1')}</p></div>
        <div><b>2</b><p>{t('modal.help2')}</p></div>
        <div><b>3</b><p>{t('modal.help3')}</p></div>
        <button className="primary-button" onClick={onClose}>{t('modal.helpDone')}</button>
    </AccessibleDialog>
  )
}
