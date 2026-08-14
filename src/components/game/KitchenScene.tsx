import { useEffect, useRef, useState } from 'react'
import {
  playBurnWarning,
  playCustomerReaction,
  playReadyCue,
  setKitchenAudioEnabled,
  startSizzle,
  stopAllKitchenAudio,
  stopSizzle,
} from '../../game/audio'
import { availableIngredients, ingredientForCookingStep, type IngredientId } from '../../landscape/campaign'
import { ingredientFoodArt } from '../../landscape/kitchen/assets'
import { placeIngredient, slotExpectedAction } from '../../landscape/kitchen/griddle'
import { layoutOrderBubbles } from '../../landscape/kitchen/orderBubbleLayout'
import { kitchenGeometryStyle, rackRectangles } from '../../landscape/kitchen/sceneGeometry'
import type { KitchenAction } from '../../landscape/kitchen/reducer'
import { applyGesture, deliverDish } from '../../landscape/kitchen/service'
import {
  nextCutTargetIndex,
  tutorialGesturePath,
  tutorialSvgPath,
  type TutorialPathKind,
} from '../../landscape/kitchen/tutorialPaths'
import { tutorialAllowsIngredient, tutorialInstruction, tutorialStep, type TutorialStep } from '../../landscape/kitchen/tutorial'
import type { KitchenState, SlotId } from '../../landscape/kitchen/types'
import { CookingGestureLayer } from './CookingGestureLayer'
import { CustomerLane } from './CustomerLane'
import { GriddleSlot } from './GriddleSlot'
import { ServingTray } from './ServingTray'
import { TableIngredient } from './TableIngredient'

type TutorialHandKind = 'drag' | 'egg' | 'hot-dog' | 'scallion' | 'pack' | 'serve'

const GUIDED_TITLES: Record<TutorialStep, string> = {
  'customer-arrival': '顾客正在走来',
  noodle: '第一步 · 放面皮',
  egg: '第二步 · 加鸡蛋',
  'wait-egg': '看火候',
  'hot-dog': '第三步 · 加热狗',
  'wait-hot-dog': '看火候',
  sauce: '第四步 · 刷酱',
  scallion: '第五步 · 撒葱花',
  cut: '第六步 · 切三刀',
  roll: '第七步 · 卷起来',
  pack: '第八步 · 装盘',
  serve: '最后一步 · 上菜',
  done: '新手引导完成',
}

const HAND_FOR_STEP: Partial<Record<TutorialStep, TutorialHandKind>> = {
  noodle: 'drag',
  egg: 'egg',
  'hot-dog': 'hot-dog',
  scallion: 'scallion',
  pack: 'pack',
  serve: 'serve',
}

const INGREDIENT_LABELS: Record<IngredientId, string> = {
  noodle: '面皮', egg: '鸡蛋', 'hot-dog': '热狗', sauce: '刷酱', scallion: '葱花', cilantro: '香菜', onion: '洋葱',
  'chili-powder': '辣椒粉', 'turkey-noodle': '火鸡面', cheese: '芝士', corn: '玉米粒', orleans: '奥尔良鸡排', bacon: '培根',
  tenderloin: '里脊肉', enoki: '金针菇',
}

const TUTORIAL_COMPLETION_TOAST_MS = 2_200

function pointInside(element: Element, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

function TutorialGestureCue({ kind, slotId, cutTargetIndices, sauceSelected, sauceStrokeCount }: {
  kind: TutorialPathKind
  slotId: SlotId
  cutTargetIndices: readonly number[]
  sauceSelected: boolean
  sauceStrokeCount: number
}) {
  const cutTargetIndex = nextCutTargetIndex(cutTargetIndices)
  const points = tutorialGesturePath(kind, cutTargetIndex)
  const label = kind === 'sauce'
    ? sauceSelected ? '左右刷两下' : '先拿起酱刷，再左右刷两下'
    : kind === 'cut' ? '沿下一条横向虚线切开' : '在饼上向右滑一下'
  return (
    <div
      className={`tutorial-gesture-cue tutorial-gesture-cue--${slotId}`}
      data-sauce-progress={kind === 'sauce' ? `${sauceStrokeCount}/2` : undefined}
      data-griddle-inner-area={slotId}
    >
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="none"
        data-tutorial-path={kind}
        data-cut-target-index={kind === 'cut' ? cutTargetIndex : undefined}
        aria-hidden="true"
      >
        {kind === 'sauce' ? (
          <>
            <path d={tutorialSvgPath(points.slice(0, 2))} />
            <path d={tutorialSvgPath(points.slice(2))} />
          </>
        ) : <path d={tutorialSvgPath(points)} />}
      </svg>
      <span>{label}</span>
    </div>
  )
}

export function KitchenScene({ state, dispatch, soundEnabled = true }: {
  state: KitchenState
  dispatch: (action: KitchenAction) => void
  soundEnabled?: boolean
}) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sauceBrushSelected, setSauceBrushSelected] = useState(false)
  const [showTutorialCompletion, setShowTutorialCompletion] = useState(false)
  const previousTutorialMode = useRef(state.tutorialMode)
  const previousSlots = useRef(new Map(state.slots.map((slot) => [slot.id, { phase: slot.phase, heatState: slot.heatState }])))
  const previousMoods = useRef(new Map(state.customers.map((customer) => [customer.id, customer.mood])))

  useEffect(() => {
    setKitchenAudioEnabled(soundEnabled)
    if (!soundEnabled || state.paused) {
      stopAllKitchenAudio()
    } else {
      state.slots.forEach((slot) => {
        const previous = previousSlots.current.get(slot.id)
        if (slot.phase === 'cooking') startSizzle(slot.id)
        else stopSizzle(slot.id)
        if (previous && previous.heatState !== slot.heatState) {
          if (slot.heatState === 'ready') playReadyCue(slot.id)
          if (slot.heatState === 'scorched' || (slot.heatState === 'burnt' && previous.heatState !== 'scorched')) playBurnWarning(slot.id)
        }
      })

      state.customers.forEach((customer) => {
        const previousMood = previousMoods.current.get(customer.id)
        if (previousMood && previousMood !== customer.mood) {
          if (customer.mood === 'happy' || customer.mood === 'disappointed' || customer.mood === 'impatient') {
            playCustomerReaction(customer.mood)
          }
        }
      })
    }

    previousSlots.current = new Map(state.slots.map((slot) => [slot.id, { phase: slot.phase, heatState: slot.heatState }]))
    previousMoods.current = new Map(state.customers.map((customer) => [customer.id, customer.mood]))
  }, [soundEnabled, state.customers, state.paused, state.slots])

  useEffect(() => () => stopAllKitchenAudio(), [])

  useEffect(() => {
    const previousMode = previousTutorialMode.current
    previousTutorialMode.current = state.tutorialMode
    if (previousMode !== 'guided-first-order' || state.tutorialMode !== 'complete') return

    setShowTutorialCompletion(true)
    const timeoutId = window.setTimeout(() => setShowTutorialCompletion(false), TUTORIAL_COMPLETION_TOAST_MS)
    return () => window.clearTimeout(timeoutId)
  }, [state.tutorialMode])

  const dispatchScene = (action: KitchenAction) => {
    if (state.tutorialMode === 'guided-first-order') {
      if (action.type === 'DROP_INGREDIENT' && !placeIngredient(state, action.slotId, action.ingredient).accepted) return
      if (action.type === 'TAP_EGG' && !placeIngredient(state, action.slotId, 'egg').accepted) return
      if (action.type === 'COMPLETE_GESTURE' && action.slotId !== 'left') return
      if (action.type === 'DELIVER' && !deliverDish(state, action.slotId, action.customerId).accepted) return
      if (action.type === 'DISCARD_SLOT') return
    }
    if (action.type === 'COMPLETE_GESTURE') {
      const gestureResult = applyGesture(state, action.slotId, action.gesture)
      if (gestureResult.accepted) {
        if (action.gesture.kind === 'sauce') {
          const slot = state.slots.find((candidate) => candidate.id === action.slotId)
          if ((slot?.sauceStrokeCount ?? 0) >= 1) setSauceBrushSelected(false)
        }
      }
    }
    if (action.type === 'DISCARD_SLOT') stopAllKitchenAudio()
    dispatch(action)
  }

  const elementAtPoint = (clientX: number, clientY: number) =>
    typeof document.elementFromPoint === 'function' ? document.elementFromPoint(clientX, clientY) : null

  const findSlotAtPoint = (clientX: number, clientY: number): SlotId | null => {
    const direct = elementAtPoint(clientX, clientY)?.closest<HTMLElement>('[data-slot-id]')?.dataset.slotId
    if (direct === 'left' || direct === 'right') return direct
    const match = [...(sceneRef.current?.querySelectorAll<HTMLElement>('[data-slot-id]') ?? [])]
      .find((element) => pointInside(element, clientX, clientY))
    return match?.dataset.slotId as SlotId | undefined ?? null
  }

  const findCustomerAtPoint = (clientX: number, clientY: number): string | null => {
    const activeCustomerIds = new Set(state.customers
      .filter((customer) => customer.presence === 'active')
      .map((customer) => customer.id))
    const direct = elementAtPoint(clientX, clientY)?.closest<HTMLElement>('[data-customer-id], [data-customer-bubble-for]')
    const directId = direct?.dataset.customerId ?? direct?.dataset.customerBubbleFor
    if (directId && activeCustomerIds.has(directId)) return directId
    const match = [...(sceneRef.current?.querySelectorAll<HTMLElement>('[data-customer-id], [data-customer-bubble-for]') ?? [])]
      .find((element) => {
        const customerId = element.dataset.customerId ?? element.dataset.customerBubbleFor
        return Boolean(customerId && activeCustomerIds.has(customerId) && pointInside(element, clientX, clientY))
      })
    return match?.dataset.customerId ?? match?.dataset.customerBubbleFor ?? null
  }

  const tapEgg = () => {
    const target = state.slots.find((slot) => {
      const expected = slotExpectedAction(state, slot.id)?.id
      return expected === 'egg' || expected === 'second-egg'
    }) ?? state.slots[0]
    if (target) dispatchScene({ type: 'TAP_EGG', slotId: target.id })
  }

  const dropIngredient = (ingredient: IngredientId, slotId: SlotId) => {
    // Sauce is a tool selection, never a generic ingredient placement.
    if (ingredient === 'sauce') {
      if (sauceEnabled) setSauceBrushSelected(true)
      return
    }
    if (!tutorialAllowsIngredient(state, ingredient, slotId)) return
    if (ingredient === 'egg') dispatchScene({ type: 'TAP_EGG', slotId })
    else dispatchScene({ type: 'DROP_INGREDIENT', slotId, ingredient })
  }

  const sauceExpected = state.slots.some((slot) => slotExpectedAction(state, slot.id)?.id === 'sauce')
  const unlockedIngredients = availableIngredients(state.day)
  const rackColumns = unlockedIngredients.length <= 6 ? 2 : 3
  const rackLayout = rackColumns === 2 ? 'approved-2x3' : 'expanded-3x5'
  const guidedStep = tutorialStep(state)
  const guided = guidedStep !== 'done'
  const guidedHand = HAND_FOR_STEP[guidedStep]
  const sauceEnabled = sauceExpected && (!guided || guidedStep === 'sauce')
  const bubbleLayout = layoutOrderBubbles(state.customers)
  const keyboardApply = (ingredient: IngredientId) => {
    if (ingredient === 'sauce') {
      if (sauceEnabled) setSauceBrushSelected(true)
      return
    }
    const slot = state.slots.find((candidate) => {
      const expected = slotExpectedAction(state, candidate.id)
      const matchesExpectedStep = expected !== null
        && ingredientForCookingStep(expected) === ingredient
      const startsEmptySlot = ingredient === 'noodle' && candidate.phase === 'empty'
      return tutorialAllowsIngredient(state, ingredient, candidate.id)
        && (matchesExpectedStep || startsEmptySlot)
    })
    if (slot) dropIngredient(ingredient, slot.id)
  }

  return (
    <div
      className="kitchen-scene"
      data-guided-tutorial={guided ? 'true' : undefined}
      data-kitchen-composition="approved-clean-live"
      ref={sceneRef}
      style={kitchenGeometryStyle(rackLayout)}
    >
      <section className="kitchen-scene__customers" aria-label="顾客队伍" data-live-customer-layer="dynamic-only">
        {state.customers.map((customer) => (
          <div
            className={`kitchen-scene__lane-anchor kitchen-scene__lane-anchor--${customer.lane}`}
            data-customer-lane-anchor={customer.lane}
            data-bubble-face-clearance={bubbleLayout[customer.id]?.clearOfCharacter ? 'true' : undefined}
            key={customer.id}
          >
            <CustomerLane customer={customer} bubblePose={bubbleLayout[customer.id]} />
          </div>
        ))}
      </section>

      <div className="kitchen-scene__counter-foreground" aria-hidden="true" />

      <section className="kitchen-scene__griddle" aria-label="双区铁板">
        {state.slots.map((slot) => (
          <GriddleSlot
            key={slot.id}
            state={state}
            slotId={slot.id}
            onMoveToTray={(slotId) => dispatchScene({ type: 'MOVE_TO_TRAY', slotId })}
          />
        ))}
      </section>

      <section
        className="kitchen-scene__ingredients"
        aria-label="桌面食材"
        data-kitchen-bin-rack="left"
        data-rack-layout={rackLayout}
        data-rack-control-polygons={JSON.stringify(rackRectangles(rackLayout).map((control) => [
          { x: control.left, y: control.top },
          { x: control.right, y: control.top },
          { x: control.right, y: control.bottom },
          { x: control.left, y: control.bottom },
        ]))}
      >
        {unlockedIngredients.map((id) => (
          <TableIngredient
            key={id}
            id={id}
            label={INGREDIENT_LABELS[id]}
            art={ingredientFoodArt(id)}
            rackIndex={unlockedIngredients.indexOf(id)}
            rackLayout={rackLayout}
            painted={id === 'sauce' && sauceBrushSelected}
            disabled={id === 'sauce' ? guided && guidedStep !== 'sauce' : guided && !tutorialAllowsIngredient(state, id, 'left')}
            findSlotAtPoint={findSlotAtPoint}
            onDrop={dropIngredient}
            onTapEgg={tapEgg}
            onKeyboardApply={keyboardApply}
          />
        ))}
      </section>

      {!guided && <section className="kitchen-scene__trash" aria-label="清理铁板">
        {state.slots.filter((slot) => slot.phase !== 'empty').map((slot) => (
          <button
            type="button"
            data-discard-slot-id={slot.id}
            key={slot.id}
            onClick={() => dispatchScene({ type: 'DISCARD_SLOT', slotId: slot.id })}
            aria-label={`丢弃${slot.id === 'left' ? '左侧' : '右侧'}铁板上的食物`}
          >
            <span aria-hidden="true">🗑️</span>
            {slot.id === 'left' ? '清左板' : '清右板'}
          </button>
        ))}
      </section>}

      <CookingGestureLayer state={state} dispatch={dispatchScene} sauceEnabled={sauceBrushSelected && sauceEnabled} />
      <ServingTray state={state} dispatch={dispatchScene} findCustomerAtPoint={findCustomerAtPoint} />
      {guided && (guidedStep === 'sauce' || guidedStep === 'cut' || guidedStep === 'roll') ? (
        <TutorialGestureCue
          kind={guidedStep}
          slotId="left"
          cutTargetIndices={state.slots[0].cutTargetIndices}
          sauceSelected={sauceBrushSelected}
          sauceStrokeCount={state.slots[0].sauceStrokeCount ?? 0}
        />
      ) : guidedHand && (
        <div
          className={`tutorial-hand tutorial-hand--${guidedHand} tutorial-hand--slot-left${guidedHand === 'serve' ? ' tutorial-hand--lane-left' : ''}`}
          data-tutorial-gesture={guidedHand}
          aria-label="操作手势提示"
        >
          <span aria-hidden="true">☝️</span>
        </div>
      )}
      {guided && (
        <aside className="guided-tutorial" data-tutorial-step={guidedStep} role="status">
          <b>{GUIDED_TITLES[guidedStep]}</b>
          <span>{tutorialInstruction(state)}</span>
        </aside>
      )}
      {showTutorialCompletion && (
        <aside className="tutorial-completion-toast" role="status">
          第一份完成！现在可以同时服务顾客了
        </aside>
      )}
    </div>
  )
}
