import { useEffect, useRef, useState } from 'react'
import homeScreen from '../assets/approved/main-ui/home-screen-user-final.png'
import daySelectScreen from '../assets/approved/main-ui/day-select-user-final.png'
import liveKitchenScreen from '../assets/approved/main-ui/kitchen-screen-live-clean.png'
import summaryScreen from '../assets/approved/main-ui/summary-screen-user-final.png'
import settingsScreen from '../assets/approved/main-ui/settings-screen-user-final.png'
import menuBoard from '../assets/approved/menu/menu-board.png'
import celebrityArt from '../assets/approved/events/day5-celebrity-event-key-art.png'
import takeawayBag from '../assets/approved/menu/takeaway-bag.png'
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from '../game/audioSettings'
import { DAYS, RECIPES, incomeForDelivery, starsForDay } from '../landscape/campaign'
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

type Screen = 'home' | 'settings' | 'select' | 'playing' | 'event' | 'summary'

const SAVE_KEY = 'night-market-campaign-v1'
export const GUIDED_TUTORIAL_KEY = 'night-market-guided-tutorial-v2'
const STAGE_ART = import.meta.glob('../assets/approved/stages/*/*.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>
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

function TopHud({ day, coins, served, target, satisfaction, sound, onHome, onMenu, onSound }: {
  day: number
  coins: number
  served: number
  target: number
  satisfaction: number
  sound: boolean
  onHome: () => void
  onMenu: () => void
  onSound: () => void
}) {
  return (
    <header className="hud">
      <button className="hud__day paper-button" onClick={onHome} aria-label="返回主页">
        <span className="hud__moon">☾</span>
        <span><b>第 {day} 天</b><small>18:45 · 夜市营业中</small></span>
      </button>
      <div className="hud__pill hud__satisfaction"><span aria-hidden="true">😊</span><b>满意度<br />{satisfaction}%</b></div>
      <div className="hud__pill hud__coins"><span>💵</span><b>¥ {coins}</b></div>
      <div className="hud__goal">
        <small>今日目标</small>
        <b><span className="sr-only">完成订单 </span>{served}/{target}</b>
        <i><span style={{ width: `${(served / target) * 100}%` }} /></i>
      </div>
      <button className="icon-button icon-button--menu" onClick={onMenu} aria-label="暂停并打开菜单">Ⅱ</button>
      <button className="icon-button icon-button--sound" onClick={onSound} aria-label="切换声音">{sound ? '♪' : '×'}</button>
    </header>
  )
}

function KitchenDaySession({ day, save, paused, backgroundInert, eventOpen, sound, guidedTutorial, qaCelebrityPatienceMs, qaServedOrders, onHome, onMenu, onSound, onHelp, onOrderServed, onEvent, onResumeEvent, onTutorialComplete, onComplete }: {
  day: DayConfig
  save: CampaignSave
  paused: boolean
  backgroundInert: boolean
  eventOpen: boolean
  sound: boolean
  guidedTutorial: boolean
  qaCelebrityPatienceMs?: number
  qaServedOrders?: number
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
  )
  const creditedCount = useRef(0)
  const eventReported = useRef(false)
  const completionReported = useRef(false)
  const tutorialCompletionReported = useRef(false)
  const previousTutorialMode = useRef(state.tutorialMode)
  const pendingCelebrityInjection = useRef<{ patienceMs?: number } | null>(null)
  const average = state.servedQualities.length
    ? Math.round(state.servedQualities.reduce((sum, quality) => sum + quality, 0) / state.servedQualities.length)
    : 100
  const [sceneScale, setSceneScale] = useState(() => Math.min(window.innerWidth / 1440, window.innerHeight / 810))
  const sceneInverseScale = sceneScale > 0 ? Math.max(1, 1 / sceneScale) : 1

  useEffect(() => {
    const updateScale = () => setSceneScale(Math.min(window.innerWidth / 1440, window.innerHeight / 810))
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

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
      onOrderServed(state.deliveries[creditedCount.current])
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
  ])

  return (
    <main
      className="game-screen"
      data-screen-art="kitchen"
      data-kitchen-tutorial-mode={state.tutorialMode}
      data-kitchen-customer-count={state.customers.length}
      inert={backgroundInert}
      aria-hidden={backgroundInert || undefined}
    >
      <div
        className="game-screen__logical"
        style={{
          '--game-bg': `url(${liveKitchenScreen})`,
          '--kitchen-live-bg': `url(${liveKitchenScreen})`,
          '--scene-scale': sceneScale,
          '--scene-inverse-scale': sceneInverseScale,
        } as React.CSSProperties}
      >
        <img
          className="game-screen__background"
          src={liveKitchenScreen}
          alt=""
          aria-hidden="true"
          data-kitchen-live-plate
          data-kitchen-source="kitchen-screen-user-final.png"
        />
        <TopHud
          day={day.day}
          coins={save.coins}
          served={state.servedQualities.length}
          target={day.targetOrders}
          satisfaction={average}
          sound={sound}
          onHome={onHome}
          onMenu={onMenu}
          onSound={onSound}
        />
        <KitchenScene state={state} dispatch={dispatch} soundEnabled={sound} />
        <button className="help-fab" onClick={onHelp}>？</button>
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
      <div className="rotate-device"><span>↻</span><b>请横屏体验夜市经营</b></div>
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
  const stagePath = `../assets/approved/stages/${recipe.id}/${recipe.id}-${stageName}.png`
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
        <span>当前资金</span><b>¥ {save.coins}</b>
      </div>
      <button aria-label="升级火力" disabled={save.fireLevel >= 2 || save.coins < (firePrice ?? Infinity)} onClick={() => onBuy('fire')}>
        <span className="upgrade-shop__icon" aria-hidden="true">🔥</span>
        <span className="upgrade-shop__copy" data-dynamic-mask="wood"><b>升级火力 Lv.{Math.min(2, save.fireLevel + 1)}</b><small>{firePrice ? `顾客耐心 +3秒 · ¥${firePrice}` : '已经满级'}</small></span>
      </button>
      <button aria-label="升级招牌" disabled={save.signLevel >= 2 || save.coins < (signPrice ?? Infinity)} onClick={() => onBuy('sign')}>
        <span className="upgrade-shop__icon" aria-hidden="true">🏮</span>
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
  const [sound, setSound] = useState(true)
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings)
  const [sessionId, setSessionId] = useState(1)
  const [guidedTutorialComplete, setGuidedTutorialComplete] = useState(readGuidedTutorialComplete)
  const abandonTriggerRef = useRef<HTMLElement | null>(null)
  const restoreAbandonFocus = useRef(false)
  const served = qualities.length
  const average = served ? Math.round(qualities.reduce((sum, value) => sum + value, 0) / served) : 100

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
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  }, [save])

  useEffect(() => {
    saveAudioSettings(audioSettings)
  }, [audioSettings])

  useEffect(() => {
    if (showAbandonConfirm || !restoreAbandonFocus.current) return
    restoreAbandonFocus.current = false
    abandonTriggerRef.current?.focus()
  }, [showAbandonConfirm])

  const openAbandonConfirm = () => {
    abandonTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setShowAbandonConfirm(true)
  }

  const continueCurrentSession = () => {
    restoreAbandonFocus.current = true
    setShowAbandonConfirm(false)
  }

  const startDay = (nextDay: DayConfig) => {
    if (nextDay.day > highestPlayableDay(save)) return
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
    setAudioSettings((current) => ({ ...current, musicMuted: !current.musicMuted }))
  }

  const setAudioLevel = (key: 'master' | 'music' | 'effects', value: number) => {
    setAudioSettings((current) => ({ ...current, [key]: value }))
  }

  if (screen === 'home') {
    return (
      <main className="home-screen home-screen--illustrated" data-screen-art="home" style={{ '--home-bg': `url(${homeScreen})` } as React.CSSProperties}>
        <div className="home-screen__plate">
          <img className="home-screen__art" src={homeScreen} alt="夜市烤冷面游戏主菜单" />
          <nav className="home-screen__hotspots" aria-label="主菜单">
            <button className="home-hotspot home-hotspot--start" aria-label="开始游戏" onClick={() => startDay(DAYS[0])}><span className="sr-only">开始游戏</span></button>
            <button className="home-hotspot home-hotspot--continue" aria-label="继续游戏" onClick={() => startDay(DAYS[highestPlayableDay(save) - 1])}><span className="sr-only">继续游戏</span></button>
            <button className="home-hotspot home-hotspot--settings" aria-label="打开设置" onClick={() => setScreen('settings')}><span className="sr-only">设置</span></button>
            <button className="home-hotspot home-hotspot--collection" aria-label="打开图鉴" onClick={() => setShowMenu(true)}><span className="sr-only">图鉴</span></button>
            <button className="home-hotspot home-hotspot--achievements" aria-label="查看关卡与成就" onClick={() => setScreen('select')}><span className="sr-only">选择关卡</span></button>
          </nav>
          <button
            className="home-screen__music-toggle"
            type="button"
            aria-label="背景音乐"
            aria-pressed={audioSettings.musicMuted}
            onClick={toggleMusic}
          ><span className="sr-only">{audioSettings.musicMuted ? '恢复背景音乐' : '静音背景音乐'}</span></button>
        </div>
        {showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
      </main>
    )
  }

  if (screen === 'settings') {
    return (
      <main className="settings-screen" aria-label="音量设置">
        <div className="settings-screen__plate">
          <img
            className="settings-screen__art"
            data-screen-art="settings"
            src={settingsScreen}
            alt="夜市烤冷面游戏音量设置"
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
          <button className="settings-screen__return" type="button" aria-label="返回主菜单" onClick={() => setScreen('home')}>
            <span className="sr-only">返回主菜单</span>
          </button>
        </div>
      </main>
    )
  }

  if (screen === 'select') {
    return (
      <main className="select-screen" data-screen-art="select" style={{ '--home-bg': `url(${daySelectScreen})` } as React.CSSProperties}>
        <div className="select-screen__plate">
          <img className="select-screen__art" src={daySelectScreen} alt="夜市营业日选择" />
          <div className="select-screen__controls">
            <button className="select-hotspot select-hotspot--back" type="button" aria-label="返回主菜单" onClick={() => setScreen('home')}><span className="sr-only">返回主菜单</span></button>
            <button className="select-hotspot select-hotspot--menu" type="button" aria-label="查看完整菜单" onClick={() => setShowMenu(true)}><span className="sr-only">查看完整菜单</span></button>
            <section className="day-grid" aria-label="营业日">
              {DAYS.map((item) => {
                const locked = item.day > highestPlayableDay(save)
                return (
                  <button
                    className={`day-card day-hotspot day-card--${item.day}${locked ? ' is-locked' : ''}`}
                    key={item.day}
                    disabled={locked}
                    aria-label={locked ? `第 ${item.day} 天尚未解锁，完成前一天后解锁` : `进入第 ${item.day} 天：${item.title}`}
                    onClick={() => startDay(item)}
                  >
                    <span className="day-card__stars day-hotspot__stars" data-dynamic-mask="parchment" aria-hidden="true">{starsText(save.bestStars[item.day] ?? 0)}</span>
                    {(locked || item.day >= 3) && (
                      <span
                        className={`day-hotspot__status${item.day >= 3 ? ' day-hotspot__status--mask' : ''}`}
                        data-dynamic-mask={item.day >= 3 ? 'parchment' : undefined}
                        aria-hidden="true"
                      >
                        {locked && <><span className="day-card__lock" aria-hidden="true">🔒</span>完成前一天后解锁</>}
                        {!locked && item.day === 5 && '★ 特别人物登场'}
                        {!locked && item.day === 6 && '🔥 明星同款热潮'}
                      </span>
                    )}
                  </button>
                )
              })}
            </section>
            <UpgradeShop save={save} onBuy={buyUpgrade} />
          </div>
        </div>
        {showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
      </main>
    )
  }

  if (screen === 'summary') {
    const stars = starsForDay(qualities, mistakes)
    return (
      <main className="summary-screen" data-screen-art="summary" style={{ '--home-bg': `url(${summaryScreen})` } as React.CSSProperties}>
        <div className="summary-screen__plate">
          <img className="summary-screen__art" src={summaryScreen} alt="今日打烊营业总结" />
          <section className="summary-card">
            <h1 className="summary-title" data-dynamic-mask="parchment">{day.title} · 营业完成</h1>
            <div className="summary-stars" data-dynamic-mask="parchment" aria-label={`${stars} 星`}>{starsText(stars)}</div>
            <p className="summary-message" data-dynamic-mask="parchment">{stars === 3 ? '手速和品质都无可挑剔，夜市里已经有人专程来找你了！' : stars === 2 ? '生意很稳，继续升级摊位就能应付更大的客流。' : '开店不容易，再练一轮一定会更顺手。'}</p>
            <div className="summary-stats" aria-label="营业数据">
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{served}</b><span className="sr-only">完成订单</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{average}%</b><span className="sr-only">平均满意度</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">{mistakes}</b><span className="sr-only">操作失误</span></div>
              <div><b className="summary-stat__value" data-dynamic-mask="parchment">¥{save.coins}</b><span className="sr-only">当前资金</span></div>
            </div>
            {day.day === 5 && celebrityDone && <div className="buzz-note">📱 明星礼貌地拍下了招牌烤冷面，第 6 天将出现“明星同款”热潮！</div>}
            <UpgradeShop save={save} onBuy={buyUpgrade} />
            <div className="summary-actions">
              <button type="button" aria-label="再玩一次" onClick={() => startDay(day)}><span>再玩一次</span></button>
              <button type="button" aria-label={day.day < 6 ? '进入下一天' : '返回选关'} onClick={() => day.day < 6 ? startDay(DAYS[day.day]) : setScreen('select')}><span>{day.day < 6 ? '进入下一天' : '返回选关'}</span></button>
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
        backgroundInert={showAbandonConfirm}
        eventOpen={screen === 'event'}
        sound={sound}
        guidedTutorial={day.day === 1 && !guidedTutorialComplete}
        qaCelebrityPatienceMs={qaCelebrityPatienceMs}
        qaServedOrders={sessionId === 1 ? qaServedOrders : undefined}
        onHome={openAbandonConfirm}
        onMenu={() => setShowMenu(true)}
        onSound={() => setSound((value) => !value)}
        onHelp={() => setShowHelp(true)}
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
      {showMenu && <MenuModal onClose={() => setShowMenu(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showAbandonConfirm && (
        <AbandonModal
          onContinue={continueCurrentSession}
          onAbandon={() => {
            setShowAbandonConfirm(false)
            setShowMenu(false)
            setShowHelp(false)
            setScreen('select')
          }}
        />
      )}
    </>
  )
}

function AbandonModal({ onContinue, onAbandon }: { onContinue: () => void; onAbandon: () => void }) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  return (
    <div className="modal-backdrop">
      <section
        className="abandon-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="放弃本次营业确认"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onContinue()
            return
          }
          if (event.key !== 'Tab') return

          const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
          if (buttons.length === 0) return
          const first = buttons[0]
          const last = buttons.at(-1)!
          if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
      >
        <h2>要结束这次营业吗？</h2>
        <p>本次未结算的订单不会计入关卡进度。</p>
        <div>
          <button className="secondary-button" onClick={onContinue}>继续营业</button>
          <button className="primary-button" onClick={onAbandon}>放弃本次营业</button>
        </div>
      </section>
    </div>
  )
}

function MenuModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="完整菜单">
      <section className="menu-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <img src={menuBoard} alt="烤冷面完整菜单" />
        <p>五款正式菜谱 · 关卡推进后会依次加入订单</p>
      </section>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="玩法说明">
      <section className="help-modal">
        <button className="modal-close" onClick={onClose} aria-label="关闭玩法说明">×</button>
        <span className="help-modal__icon">🍳</span>
        <h2>三步学会摆摊</h2>
        <div><b>1</b><p>看左侧订单和铁板上方的“下一步”。</p></div>
        <div><b>2</b><p>点击或拖动食材；刷酱时先拿起桌面酱刷，再沿提示来回滑动。切段要划过三条不同横线。</p></div>
        <div><b>3</b><p>在耐心耗尽前装袋，速度越快、失误越少，收入和满意度越高。</p></div>
        <button className="primary-button" onClick={onClose}>知道了，开摊！</button>
      </section>
    </div>
  )
}
