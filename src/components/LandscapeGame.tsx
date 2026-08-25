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

function KitchenDaySession({ day, save, paused, backgroundInert, eventOpen, musicEnabled, effectsEnabled, guidedTutorial, qaCelebrityPatienceMs, qaServedOrders, qaPatienceRatio, qaDeliveryFeedback, onHome, onMenu, onSound, onHelp, onOrderServed, onEvent, onResumeEvent, onTutorialComplete, onComplete }: {
  day: DayConfig
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
  onComplete: (qualities: number[], mistakes: number) => void
}) {
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
      onComplete([...state.servedQualities], state.mistakes)
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
        <KitchenScene state={state} dispatch={dispatch} soundEnabled={effectsEnabled} />
        <DeliveryFeedback feedback={deliveryFeedback} held={qaDeliveryFeedback} />
        <button className="help-fab" onClick={onHelp} aria-label="打开玩法说明" aria-keyshortcuts="H">？</button>
        {eventOpen && (
          <div className="event-screen event-screen--overlay">
            <div className="event-screen__art" style={{ backgroundImage: `url(${celebrityArt})` }} />
            <section className="dialogue-box">
              <span className="event-tag">第五天 · 惊喜来客</span>
              <h1>旅途中顺路来尝尝</h1>
              <p>“你好，听朋友说你家的烤冷面很好吃。麻烦来一份招牌芝士火鸡款，谢谢。”</p>
              <div className="whisper">排队的顾客：等等……这也太帅了吧！</div>
              <button
                className="primary-button"
                onClick={() => {
                  pendingCelebrityInjection.current = { patienceMs: qaCelebrityPatienceMs }
                  onResumeEvent()
                }}
              >好的，马上为你做！</button>
            </section>
          </div>
        )}
        </div>
      </div>
      <div className="rotate-device"><GameIcon name="roll" /><b>请横屏体验夜市经营</b></div>
    </main>
  )
}

function FoodStage({ recipe, completedCount, currentStep, repeatProgress = 0 }: {
  recipe: Recipe
  completedCount: number
  currentStep?: CookingStep
  repeatProgress?: number
}) {
  const stageNames = STAGE_NAMES[recipe.id]
  const stageIndex = clamp(completedCount, 0, stageNames.length - 1)
  const stageName = stageNames[stageIndex]
  const stagePath = `../assets/runtime/stages/${recipe.id}/${recipe.id}-${stageName}.webp`
  const completeStageArt = STAGE_ART[stagePath]
  if (completeStageArt) return <img className="stage-complete-art" src={completeStageArt} alt={`${recipe.shortName}制作阶段 ${stageIndex + 1}`} />
  const applied = recipe.steps.slice(0, completedCount)
  const appliedIds = applied.map((step) => step.id)
  const isPacked = appliedIds.includes('pack')
  const isRolled = appliedIds.includes('roll')
  const hasCut = appliedIds.includes('cut') || currentStep?.id === 'cut'
  const partialSauce = currentStep?.id === 'sauce' ? repeatProgress : 0

  if (completedCount === 0) {
    return <div className="drop-hint"><b>把「{currentStep?.label ?? '面皮'}」拖到铁板</b><small>也可以直接点击下方按钮</small></div>
  }

  if (isPacked) return <img className="stage-packed" src={takeawayBag} alt="已经装袋的烤冷面" />
  if (isRolled) return <img className="stage-rolled" src={recipe.image} alt="已经卷起的烤冷面" />

  return (
    <div className="food-stage" aria-label={`制作阶段：已完成 ${completedCount} 步`}>
      {applied.map((step, index) => {
        if (!step.asset || ['roll', 'pack', 'cut'].includes(step.id)) return null
        return <img className={`stage-layer stage-layer--${step.id}`} src={step.asset} alt={step.label} key={`${step.id}-${index}`} />
      })}
      {partialSauce > 0 && currentStep?.asset && Array.from({ length: partialSauce }).map((_, index) => (
        <img className={`stage-layer stage-layer--sauce stage-layer--partial-${index + 1}`} src={currentStep.asset} alt="正在刷酱" key={`partial-sauce-${index}`} />
      ))}
      {hasCut && <div className="stage-cuts">{[0, 1, 2].map((cut) => <i className={appliedIds.includes('cut') || cut < repeatProgress ? 'done' : ''} key={cut} />)}</div>}
    </div>
  )
}

function UpgradeShop({ save, onBuy }: { save: CampaignSave; onBuy: (type: 'fire' | 'sign') => void }) {
  const firePrice = [40, 80][save.fireLevel]
  const signPrice = [60, 110][save.signLevel]
  return (
    <section className="upgrade-shop" aria-label="摊位升级">
      <div className="upgrade-shop__funds" data-upgrade-funds data-dynamic-mask="wood">
        <span className="upgrade-shop__icon upgrade-shop__icon--funds" aria-hidden="true"><UpgradeCardIcon kind="funds" /></span>
        <span>当前资金</span><b>¥ {save.coins}</b>
      </div>
      <button aria-label="升级火力" disabled={save.fireLevel >= 2 || save.coins < (firePrice ?? Infinity)} onClick={() => onBuy('fire')}>
        <span className="upgrade-shop__icon upgrade-shop__icon--fire" aria-hidden="true"><UpgradeCardIcon kind="fire" /></span>
        <span className="upgrade-shop__copy" data-dynamic-mask="wood"><b>升级火力 Lv.{Math.min(2, save.fireLevel + 1)}</b><small>{firePrice ? `顾客耐心 +3秒 · ¥${firePrice}` : '已经满级'}</small></span>
      </button>
      <button aria-label="升级招牌" disabled={save.signLevel >= 2 || save.coins < (signPrice ?? Infinity)} onClick={() => onBuy('sign')}>
        <span className="upgrade-shop__icon upgrade-shop__icon--sign" aria-hidden="true"><UpgradeCardIcon kind="sign" /></span>
        <span className="upgrade-shop__copy" data-dynamic-mask="wood"><b>升级招牌 Lv.{Math.min(2, save.signLevel + 1)}</b><small>{signPrice ? `每单额外 +2元 · ¥${signPrice}` : '已经满级'}</small></span>
      </button>
    </section>
  )
}

export function LandscapeGame() {
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
  const [guidedTutorialComplete, setGuidedTutorialComplete] = useState(readGuidedTutorialComplete)
  const served = qualities.length
  const average = served ? Math.round(qualities.reduce((sum, value) => sum + value, 0) / served) : 100
  const uiFeedback = createUiFeedback(audioSettings.master * audioSettings.effects > 0)
  const dialogOpen = showMenu || showHelp || showAbandonConfirm

  useGameplayShortcuts({
    enabled: screen === 'playing',
    dialogOpen,
    onPause: () => {
      uiFeedback.tap()
      setShowMenu(true)
    },
    onHelp: () => {
      uiFeedback.tap()
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
    setSessionId((value) => value + 1)
    setDay(nextDay)
    setQualities([])
    setMistakes(0)
    setCelebrityDone(false)
    setScreen('playing')
  }

  const finishDay = (nextQualities: number[], nextMistakes: number) => {
    const stars = starsForDay(nextQualities, nextMistakes)
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
          <img className="home-screen__art" src={homeScreen} alt="夜市烤冷面游戏主菜单" fetchPriority="high" />
          <nav className="home-screen__hotspots" aria-label="主菜单">
            <button className="home-hotspot home-hotspot--start" aria-label="开始游戏" onClick={() => startDay(DAYS[0])}><span className="sr-only">开始游戏</span></button>
            <button className="home-hotspot home-hotspot--continue" aria-label="继续游戏" onClick={() => startDay(DAYS[highestPlayableDay(save) - 1])}><span className="sr-only">继续游戏</span></button>
            <button className="home-hotspot home-hotspot--settings" aria-label="打开设置" onClick={() => openScreen('settings')}><span className="sr-only">设置</span></button>
            <button className="home-hotspot home-hotspot--collection" aria-label="打开图鉴" onClick={openMenu}><span className="sr-only">图鉴</span></button>
            <button className="home-hotspot home-hotspot--achievements" aria-label="查看关卡与成就" onClick={() => openScreen('select')}><span className="sr-only">选择关卡</span></button>
          </nav>
          <button
            className="home-screen__music-toggle"
            type="button"
            aria-label="背景音乐"
            aria-pressed={audioSettings.musicMuted}
            onClick={toggleMusic}
          ><span className="sr-only">{audioSettings.musicMuted ? '恢复背景音乐' : '静音背景音乐'}</span></button>
        </div>
        {showMenu && <MenuModal onClose={closeMenu} />}
      </main>
    )
  }

  if (screen === 'settings') {
    return (
      <main className="settings-screen ui-screen" data-ui-screen="settings" aria-label="音量设置">
        <div className="settings-screen__plate">
          <img
            className="settings-screen__art"
            data-screen-art="settings"
            src={settingsScreen}
            alt="夜市烤冷面游戏音量设置"
            fetchPriority="high"
          />
          <img
            className="settings-screen__rail-clean-patch"
            src={settingsSliderCleanPatch}
            alt=""
            aria-hidden="true"
          />
          <div className="settings-screen__controls">
            <label className="settings-slider settings-slider--master">
              <span className="sr-only">总音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.master}
                data-level={audioSettings.master.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.master * 100}%` } as React.CSSProperties}
                aria-label="总音量"
                onChange={(event) => setAudioLevel('master', Number(event.currentTarget.value))}
              />
            </label>
            <label className="settings-slider settings-slider--music">
              <span className="sr-only">背景音乐音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.music}
                data-level={audioSettings.music.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.music * 100}%` } as React.CSSProperties}
                aria-label="背景音乐音量"
                onChange={(event) => setAudioLevel('music', Number(event.currentTarget.value))}
              />
            </label>
            <label className="settings-slider settings-slider--effects">
              <span className="sr-only">音效音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioSettings.effects}
                data-level={audioSettings.effects.toFixed(2)}
                style={{ '--settings-level': `${audioSettings.effects * 100}%` } as React.CSSProperties}
                aria-label="音效音量"
                onChange={(event) => setAudioLevel('effects', Number(event.currentTarget.value))}
              />
            </label>
          </div>
          <button
            className="settings-screen__music-toggle"
            type="button"
            aria-label="背景音乐"
            aria-pressed={audioSettings.musicMuted}
            onClick={toggleMusic}
          ><span className="sr-only">{audioSettings.musicMuted ? '恢复背景音乐' : '静音背景音乐'}</span></button>
          <button className="settings-screen__return" type="button" aria-label="返回主菜单" onClick={() => openScreen('home')}>
            <span className="sr-only">返回主菜单</span>
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'select') {
    const playableDay = highestPlayableDay(save)
    const campaignComplete = DAYS.every((item) => (save.bestStars[item.day] ?? 0) > 0)
    const currentRetentionDay = campaignComplete ? DAYS.length : playableDay
    const currentRetentionCue = retentionCueForDay(currentRetentionDay)
    return (
      <main className="select-screen ui-screen" data-screen-art="select" data-ui-screen="select" style={{ '--home-bg': `url(${daySelectScreen})` } as React.CSSProperties}>
        <div className="select-screen__plate">
          <img className="select-screen__art" src={daySelectScreen} alt="夜市营业日选择" fetchPriority="high" />
          <div className="select-screen__controls">
            <button className="select-hotspot select-hotspot--back" type="button" aria-label="返回主菜单" onClick={() => openScreen('home')}><span className="sr-only">返回主菜单</span></button>
            <button className="select-hotspot select-hotspot--menu" type="button" aria-label="查看完整菜单" onClick={openMenu}><span className="sr-only">查看完整菜单</span></button>
            <section className="day-grid" aria-label="营业日">
              {DAYS.map((item) => {
                const locked = item.day > playableDay
                const currentTarget = !locked && item.day === currentRetentionDay
                const currentHook = campaignComplete ? '全章完成 · 冲三星' : currentRetentionCue.shortHook
                const accessibleLabel = locked
                  ? `第 ${item.day} 天尚未解锁，完成前一天后解锁`
                  : currentTarget
                    ? `进入第 ${item.day} 天：${item.title}。当前目标：${item.goal}。${currentHook}`
                    : `进入第 ${item.day} 天：${item.title}`
                return (
                  <button
                    className={`day-card day-hotspot day-card--${item.day}${locked ? ' is-locked' : ''}`}
                    key={item.day}
                    disabled={locked}
                    aria-label={accessibleLabel}
                    onClick={() => startDay(item)}
                  >
                    <span className="day-card__stars day-hotspot__stars" data-dynamic-mask="parchment" aria-hidden="true">{starsText(save.bestStars[item.day] ?? 0)}</span>
                    {(locked || currentTarget) && (
                      <span
                        className="day-hotspot__status day-hotspot__status--mask"
                        data-dynamic-mask="parchment"
                        data-current-day-hook={currentTarget ? true : undefined}
                        aria-hidden={currentTarget ? undefined : true}
                      >
                        {locked && <><span className="day-card__lock" aria-hidden="true"><GameIcon name="lock" /></span>完成前一天后解锁</>}
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
    const nextCue = nextRetentionCue(day.day)
    return (
      <main className="summary-screen ui-screen" data-screen-art="summary" data-ui-screen="summary" style={{ '--home-bg': `url(${summaryScreen})` } as React.CSSProperties}>
        <div className="summary-screen__plate">
          <img className="summary-screen__art" src={summaryScreen} alt="今日打烊营业总结" fetchPriority="high" />
          <section className="summary-card">
            <h1 className="summary-title" data-dynamic-mask="parchment">{day.title} · 营业完成</h1>
            <div className="summary-stars" data-dynamic-mask="parchment" aria-label={`${stars} 星`}>{starsText(stars)}</div>
            <p className="summary-message" data-dynamic-mask="parchment">{stars === 3 ? '手速和品质都无可挑剔，夜市里已经有人专程来找你了！' : stars === 2 ? '生意很稳，继续升级摊位就能应付更大的客流。' : '开店不容易，再练一轮一定会更顺手。'}</p>
            <DayRetentionCue cue={nextCue} />
            <div className="summary-stats" aria-label="营业数据">
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{served}</b><span className="sr-only">完成订单</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{average}%</b><span className="sr-only">平均满意度</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{mistakes}</b><span className="sr-only">操作失误</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">¥{save.coins}</b><span className="sr-only">当前资金</span></div>
            </div>
            {day.day === 5 && celebrityDone && <div className="buzz-note">明星礼貌地拍下了招牌烤冷面，第 6 天将出现“明星同款”热潮！</div>}
            <UpgradeShop save={save} onBuy={buyUpgrade} />
            <div className="summary-actions">
              <button type="button" aria-label="再玩一次" onClick={() => startDay(day)}><span>再玩一次</span></button>
              <button type="button" aria-label={nextCue ? `进入下一天：${nextCue.title}` : '返回选关'} onClick={() => nextCue ? startDay(DAYS[day.day]) : openScreen('select')}><span>{nextCue ? `明天 · ${nextCue.title}` : '返回选关'}</span></button>
            </div>
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
  return (
    <AccessibleDialog label="放弃本次营业确认" className="abandon-modal" onClose={onContinue}>
        <h2>要结束这次营业吗？</h2>
        <p>本次未结算的订单不会计入关卡进度。</p>
        <div>
          <button className="secondary-button" onClick={onContinue}>继续营业</button>
          <button className="primary-button" onClick={onAbandon}>放弃本次营业</button>
        </div>
    </AccessibleDialog>
  )
}

function MenuModal({ onClose }: { onClose: () => void }) {
  return (
    <AccessibleDialog label="完整菜单" className="menu-modal" onClose={onClose}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img src={menuBoard} alt="烤冷面完整菜单" />
        <p>五款正式菜谱 · 关卡推进后会依次加入订单</p>
    </AccessibleDialog>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <AccessibleDialog label="玩法说明" className="help-modal" onClose={onClose}>
        <button className="modal-close" onClick={onClose} aria-label="关闭玩法说明">×</button>
        <span className="help-modal__icon" aria-hidden="true"><GameIcon name="heat" /></span>
        <h2>三步学会摆摊</h2>
        <div><b>1</b><p>看左侧订单和铁板上方的“下一步”。</p></div>
        <div><b>2</b><p>点一下食材会自动放到正确铁板，也可拖到指定铁板；餐盒同样支持点击交付或拖给顾客。</p></div>
        <div><b>3</b><p>在耐心耗尽前装袋，速度越快、失误越少，收入和满意度越高。</p></div>
        <button className="primary-button" onClick={onClose}>知道了，开摊！</button>
    </AccessibleDialog>
  )
}
