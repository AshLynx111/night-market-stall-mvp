import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { kitchenReducer, type KitchenAction } from '../../landscape/kitchen/reducer'
import { advanceCustomers } from '../../landscape/kitchen/queue'
import { createKitchenState } from '../../landscape/kitchen/state'
import type { KitchenState } from '../../landscape/kitchen/types'
import { TUTORIAL_GESTURE_RECT, tutorialGesturePath } from '../../landscape/kitchen/tutorialPaths'
import { KitchenScene } from './KitchenScene'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null

function activeKitchenState(day: number, seed: number, guidedTutorial = false): KitchenState {
  return advanceCustomers(createKitchenState(day, seed, 0, guidedTutorial), 2_600)
}

function pointer(target: Element, type: string, { x = 0, y = 0, pointerId = 1, pointerType = 'mouse' } = {}) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  })
  act(() => target.dispatchEvent(event))
}

function bounds(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left, y: top, left, top, width, height,
    right: left + width, bottom: top + height,
    toJSON: () => ({}),
  }
}

function renderScene(state: KitchenState, dispatch = vi.fn<(action: KitchenAction) => void>()) {
  const container = document.createElement('div')
  root = createRoot(container)
  act(() => root?.render(<KitchenScene state={state} dispatch={dispatch} />))
  const rerender = (nextState: KitchenState) => act(() => root?.render(<KitchenScene state={nextState} dispatch={dispatch} />))
  return { container, dispatch, rerender }
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = null
  vi.useRealTimers()
})

describe('KitchenScene', () => {
  it('uses the approved clean kitchen composition with live customer lanes above the mask', () => {
    const { container } = renderScene(activeKitchenState(1, 1))

    expect(container.querySelector('.kitchen-scene')?.getAttribute('data-kitchen-composition')).toBe('approved-clean-live')
    expect(container.querySelector('.kitchen-scene__customers')?.getAttribute('data-live-customer-layer')).toBe('dynamic-only')
    expect(container.querySelectorAll('[data-customer-lane-anchor]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-baked-customer]')).toHaveLength(0)
  })

  it('keeps every active order bubble clear of its customer face in the three-lane composition', () => {
    const { container } = renderScene(activeKitchenState(3, 1))

    expect(container.querySelectorAll('[data-customer-bubble-for]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-customer-lane-anchor][data-bubble-face-clearance="true"]')).toHaveLength(3)
  })

  it('declares the approved left bin rack and exact two-griddle interaction anchors', () => {
    const { container } = renderScene(activeKitchenState(5, 1))

    expect(container.querySelector('.kitchen-scene__ingredients')?.getAttribute('data-kitchen-bin-rack')).toBe('left')
    expect(container.querySelectorAll('.griddle-slot[data-griddle-hitbox]')).toHaveLength(2)
    expect(container.querySelector('.griddle-slot--left')?.getAttribute('data-griddle-hitbox')).toBe('left')
    expect(container.querySelector('.griddle-slot--right')?.getAttribute('data-griddle-hitbox')).toBe('right')
  })

  it('renders the two-slot, three-customer Day 3 scene without legacy panels', () => {
    const { container } = renderScene(createKitchenState(3, 1))

    expect(container.querySelectorAll('[data-customer-id]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-slot-id]')).toHaveLength(2)
    expect(container.querySelector('[data-ingredient-id="turkey-noodle"]')).not.toBeNull()
    expect(container.querySelector('.action-dock')).toBeNull()
    expect(container.querySelector('.ingredient-card-bar')).toBeNull()
    expect(container.querySelector('.order-panel')).toBeNull()
  })

  it('renders compact ingredient and heat modifiers inside their customer bubbles', () => {
    const { container } = renderScene(activeKitchenState(6, 1))

    expect(container.querySelector('[data-order-modifier-kind="heat"]')).not.toBeNull()
    expect(container.querySelector('[data-order-modifier-kind="extra"]')).not.toBeNull()
    expect(container.querySelectorAll('.kitchen-customer__modifier img').length).toBeGreaterThan(0)
  })

  it('renders both +egg and mild preference chips for the live celebrity order', () => {
    let state = kitchenReducer(createKitchenState(5, 1), { type: 'INJECT_CELEBRITY' })
    state = {
      ...state,
      customers: state.customers.map((customer, index) => index === 2
        ? { ...customer, presence: 'leaving' as const, mood: 'happy' as const, motionElapsedMs: 0 }
        : customer),
    }
    state = kitchenReducer(state, { type: 'TICK', deltaMs: 1_300 })
    state = kitchenReducer(state, { type: 'TICK', deltaMs: 1_700 })
    const { container } = renderScene(state)
    const celebrity = container.querySelector('[data-customer-art-id="celebrity"]')!
    const lane = celebrity.closest('.kitchen-customer')!

    expect(lane.querySelector('[data-order-modifier-kind="extra"][data-order-modifier-ingredient="egg"]')).not.toBeNull()
    expect(lane.querySelector('[data-order-modifier-level="mild"]')).not.toBeNull()
  })

  it('uses motion art while entering and hides the order until active', () => {
    const start = createKitchenState(1, 1)
    const { container, rerender } = renderScene(start)
    expect(container.querySelector('[data-customer-motion-phase="walking-in"]')).not.toBeNull()
    expect(container.querySelector('[data-customer-bubble-for="customer-0"]')).toBeNull()

    const active = kitchenReducer(start, { type: 'TICK', deltaMs: 1_700 })
    rerender(active)
    expect(container.querySelector('[data-customer-motion-phase="active"]')).not.toBeNull()
    expect(container.querySelector('[data-customer-bubble-for="customer-0"]')).not.toBeNull()
  })

  it('removes the bubble before departure movement begins', () => {
    const start = kitchenReducer(createKitchenState(1, 1), { type: 'TICK', deltaMs: 1_700 })
    const leaving = {
      ...start,
      customers: start.customers.map((customer, index) => index === 0
        ? { ...customer, presence: 'leaving' as const, mood: 'happy' as const, motionElapsedMs: 0 }
        : customer),
    }
    const { container } = renderScene(leaving)
    expect(container.querySelector('[data-customer-bubble-for="customer-0"]')).toBeNull()
    expect(container.querySelector('[data-customer-motion-phase="turning-out"]')).not.toBeNull()
  })

  it('renders order art, modifiers, and a visual patience bar without name or seconds', () => {
    const active = kitchenReducer(createKitchenState(3, 1), { type: 'TICK', deltaMs: 1_700 })
    const { container } = renderScene(active)
    const bubble = container.querySelector('[data-customer-bubble-for="customer-0"]')!
    expect(bubble.querySelector('img')).not.toBeNull()
    expect(bubble.querySelector('.kitchen-customer__patience')).not.toBeNull()
    expect(bubble.querySelector('strong')).toBeNull()
    expect(bubble.textContent).not.toMatch(/\d+s/)
    expect(bubble.getAttribute('aria-label')).toContain(active.customers[0].name)
    expect(bubble.getAttribute('aria-label')).toContain('经典款烤冷面')
    expect(bubble.getAttribute('aria-label')).toContain('加量')
    expect(bubble.getAttribute('aria-label')).toContain('剩余耐心')
  })

  it('renders one complete stage image instead of a base image plus ingredient overlays', () => {
    let state = activeKitchenState(4, 1)
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = kitchenReducer(state, { type: 'TAP_EGG', slotId: 'left' })
    state = kitchenReducer(state, { type: 'TICK', deltaMs: 4_000 })
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
    state = kitchenReducer(state, { type: 'TICK', deltaMs: 3_000 })
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'bacon' })
    const { container, rerender } = renderScene(state)

    expect(container.querySelectorAll('.griddle-slot--left .griddle-slot__food img')).toHaveLength(1)
    expect(container.querySelector('.griddle-slot--left .griddle-slot__stage-art')).not.toBeNull()
    expect(container.querySelector('[data-modifier-overlay]')).toBeNull()

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 3_500 })
    rerender(state)
    expect(container.querySelectorAll('.griddle-slot--left .griddle-slot__food img')).toHaveLength(1)
  })

  it.each([
    { day: 1, ids: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'], rackSlots: 5 },
    { day: 3, ids: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder', 'turkey-noodle', 'cheese', 'corn'], rackSlots: 11 },
    { day: 5, ids: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder', 'turkey-noodle', 'cheese', 'corn', 'orleans', 'bacon', 'tenderloin', 'enoki'], rackSlots: 15 },
  ])('renders Day $day unlocked ingredients as complete bins in unique rack cells', ({ day, ids, rackSlots }) => {
    const { container } = renderScene(activeKitchenState(day, 1))
    const ingredients = [...container.querySelectorAll<HTMLButtonElement>('[data-ingredient-id]')]
    const controls = ingredients

    expect(ingredients.map((ingredient) => ingredient.dataset.ingredientId)).toEqual(ids)
    expect(container.querySelector('.table-ingredient__vessel')).toBeNull()
    expect(container.querySelector('.table-ingredient__contents')).toBeNull()
    ingredients.forEach((ingredient) => {
      expect(ingredient.querySelectorAll(':scope > img.table-ingredient__bin-art')).toHaveLength(1)
    })
    expect(container.querySelector('[data-ingredient-id="sauce"] img')?.getAttribute('src')).toContain('ingredient-bin-sauce.png')
    expect(container.querySelector('[data-sauce-brush]')).toBeNull()

    expect(controls).toHaveLength(rackSlots)
    expect(controls.map((control) => Number(control.dataset.rackIndex)).sort((left, right) => left - right)).toEqual(
      Array.from({ length: rackSlots }, (_, index) => index),
    )
    expect(new Set(controls.map((control) => `${control.dataset.rackColumn}:${control.dataset.rackRow}`)).size)
      .toBe(controls.length)
  })

  it('exposes perspective pose variables on foot-anchored customer actors', () => {
    const { container } = renderScene(activeKitchenState(1, 1))
    const actor = container.querySelector<HTMLElement>('[data-customer-id="customer-0"]')!

    expect(actor.style.getPropertyValue('--customer-x')).toBe('390px')
    expect(actor.style.getPropertyValue('--customer-foot-y')).toBe('515px')
    expect(actor.style.getPropertyValue('--customer-scale')).toBe('1')
    expect(actor.style.getPropertyValue('--customer-opacity')).toBe('1')
  })

  it('renders one customer monotonically from progress 0 through 0.5 to 1', () => {
    const start = createKitchenState(3, 1)
    const customer = start.customers[0]
    const stateAt = (pathProgress: number) => ({
      ...start,
      customers: start.customers.map((candidate) => candidate.id === customer.id
        ? { ...candidate, pathProgress, presence: pathProgress === 1 ? 'active' as const : 'entering' as const }
        : candidate),
    })
    const { container, rerender } = renderScene(stateAt(0))
    const poses = [0, 0.5, 1].map((progress) => {
      rerender(stateAt(progress))
      const actor = container.querySelector<HTMLElement>(`[data-customer-id="${customer.id}"]`)!
      return {
        scale: Number(actor.style.getPropertyValue('--customer-scale')),
        footX: Number.parseFloat(actor.style.getPropertyValue('--customer-x')),
        footY: Number.parseFloat(actor.style.getPropertyValue('--customer-foot-y')),
      }
    })

    expect(poses.map((pose) => pose.scale)).toEqual([1, 1, 1])
    expect(poses.map((pose) => pose.footY)).toEqual([515, 515, 515])
    expect(poses[0].footX).toBeLessThan(poses[1].footX)
    expect(poses[1].footX).toBeLessThan(poses[2].footX)
  })

  it('keeps the rendered near-foot anchor within one pixel for every stationary emotion', () => {
    const start = createKitchenState(3, 1)
    const customer = start.customers[0]
    const moods = ['ordering', 'waiting', 'impatient', 'urgent', 'happy', 'disappointed'] as const
    const stateFor = (mood: typeof moods[number]) => ({
      ...start,
      customers: start.customers.map((candidate) => candidate.id === customer.id
        ? { ...candidate, mood, pathProgress: 1 }
        : candidate),
    })
    const { container, rerender } = renderScene(stateFor('ordering'))
    const renderedFootYs = moods.map((mood) => {
      rerender(stateFor(mood))
      const actor = container.querySelector<HTMLElement>(`[data-customer-id="${customer.id}"]`)!
      return Number.parseFloat(actor.style.getPropertyValue('--customer-foot-y'))
    })

    expect(Math.max(...renderedFootYs) - Math.min(...renderedFootYs)).toBeLessThanOrEqual(1)
  })

  it.each(['mouse', 'touch'] as const)('uses Pointer Events for %s ingredient dragging', (pointerType) => {
    const { container, dispatch } = renderScene(createKitchenState(3, 1))
    const noodle = container.querySelector('[data-ingredient-id="noodle"]')!
    const leftSlot = container.querySelector('[data-slot-id="left"]')!
    vi.spyOn(leftSlot, 'getBoundingClientRect').mockReturnValue(bounds(200, 200, 100, 100))

    pointer(noodle, 'pointerdown', { x: 10, y: 10, pointerId: 50, pointerType })
    pointer(noodle, 'pointermove', { x: 230, y: 230, pointerId: 50, pointerType })
    pointer(noodle, 'pointerup', { x: 230, y: 230, pointerId: 50, pointerType })

    expect(dispatch).toHaveBeenCalledWith({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
  })

  it('taps eggs into the first slot currently expecting an egg', () => {
    const readyForEgg = kitchenReducer(createKitchenState(1, 1), {
      type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle',
    })
    const { container, dispatch } = renderScene(readyForEgg)
    const egg = container.querySelector('[data-ingredient-id="egg"]')!

    pointer(egg, 'pointerdown', { pointerId: 7, pointerType: 'touch' })
    pointer(egg, 'pointerup', { pointerId: 7, pointerType: 'touch' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'TAP_EGG', slotId: 'left' })
  })

  it('drops a dragged ingredient onto the slot intersecting its release point', () => {
    const { container, dispatch } = renderScene(activeKitchenState(1, 1))
    const noodle = container.querySelector('[data-ingredient-id="noodle"]')!
    const rightSlot = container.querySelector('[data-slot-id="right"]')!
    vi.spyOn(rightSlot, 'getBoundingClientRect').mockReturnValue(bounds(200, 200, 100, 100))

    pointer(noodle, 'pointerdown', { x: 10, y: 10, pointerId: 8, pointerType: 'pen' })
    pointer(noodle, 'pointermove', { x: 230, y: 230, pointerId: 8, pointerType: 'pen' })
    pointer(noodle, 'pointerup', { x: 230, y: 230, pointerId: 8, pointerType: 'pen' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    expect(container.querySelector('.table-ingredient__ghost')).toBeNull()
  })

  it('aligns the ingredient ghost to logical coordinates in a scaled scene', () => {
    const { container } = renderScene(createKitchenState(1, 1))
    const scene = container.querySelector('.kitchen-scene')!
    const noodle = container.querySelector('[data-ingredient-id="noodle"]')!
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(bounds(100, 50, 720, 405))

    pointer(noodle, 'pointerdown', { x: 110, y: 60, pointerId: 41 })
    pointer(noodle, 'pointermove', { x: 460, y: 185, pointerId: 41 })

    const binArt = noodle.querySelector<HTMLImageElement>('.table-ingredient__bin-art')!
    const ghost = container.querySelector<HTMLImageElement>('.table-ingredient__ghost')!
    expect(ghost.style.left).toBe('720px')
    expect(ghost.style.top).toBe('270px')
    expect(ghost.src).toBe(binArt.src)
  })

  it('keeps a cooking gesture bound to the slot under pointer-down', () => {
    const start = createKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'gesturing', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'],
    }
    const { container, dispatch } = renderScene({ ...start, slots })
    const gestureTarget = container.querySelector('[data-gesture-slot-id="left"]')!
    vi.spyOn(gestureTarget, 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 100, 100))

    pointer(gestureTarget, 'pointerdown', { x: 10, y: 20, pointerId: 9 })
    pointer(gestureTarget, 'pointermove', { x: 230, y: 20, pointerId: 9 })
    pointer(gestureTarget, 'pointerup', { x: 240, y: 20, pointerId: 9 })

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'COMPLETE_GESTURE', slotId: 'left' }))
  })

  it.each(['mouse', 'touch'] as const)('requires picking up the sauce brush and keeps it ready for two easy %s swipes', (pointerType) => {
    const start = createKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'gesturing', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog'],
    }
    const { container, dispatch } = renderScene({ ...start, slots })
    const brush = container.querySelector('[data-ingredient-id="sauce"]')!

    expect(brush.querySelector('img')?.getAttribute('src')).toContain('ingredient-bin-sauce.png')
    expect(container.querySelector('[data-gesture-slot-id="left"]')).toBeNull()
    pointer(brush, 'pointerup', { pointerId: 61, pointerType })

    const target = container.querySelector('[data-gesture-slot-id="left"]')!
    expect(target).not.toBeNull()
    expect(brush.getAttribute('aria-pressed')).toBe('true')
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 100, 100))
    const path = tutorialGesturePath('sauce').map((point) => ({
      x: point.x / TUTORIAL_GESTURE_RECT.width * 100,
      y: point.y / TUTORIAL_GESTURE_RECT.height * 100,
    }))
    pointer(target, 'pointerdown', { ...path[0], pointerId: 62, pointerType })
    path.slice(1, -1).forEach((point) => pointer(target, 'pointermove', { ...point, pointerId: 62, pointerType }))
    pointer(target, 'pointerup', { ...path.at(-1), pointerId: 62, pointerType })

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'COMPLETE_GESTURE',
      slotId: 'left',
      gesture: expect.objectContaining({ kind: 'sauce', complete: true }),
    }))
    expect(container.querySelector('[data-gesture-slot-id="left"]')).not.toBeNull()
    expect(brush.getAttribute('aria-pressed')).toBe('true')
    expect(container.querySelector('.table-ingredient__ghost')).toBeNull()
  })

  it.each(['mouse', 'touch'] as const)('uses the sauce bin as a tool selector and requires two %s strokes before sauce is complete', (pointerType) => {
    const start = createKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'gesturing', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog'],
    }
    const sauceState = { ...start, slots }
    const { container, dispatch } = renderScene(sauceState)
    const sauceBin = container.querySelector<HTMLElement>('[data-ingredient-id="sauce"]')!
    const leftSlot = container.querySelector('[data-slot-id="left"]')!
    vi.spyOn(leftSlot, 'getBoundingClientRect').mockReturnValue(bounds(200, 200, 100, 100))

    // Tap, click, and a pointer drag all choose the tool; none can place sauce as an ingredient.
    pointer(sauceBin, 'pointerdown', { x: 10, y: 10, pointerId: 70, pointerType })
    pointer(sauceBin, 'pointerup', { x: 10, y: 10, pointerId: 70, pointerType })
    act(() => sauceBin.click())
    pointer(sauceBin, 'pointerdown', { x: 10, y: 10, pointerId: 71, pointerType })
    pointer(sauceBin, 'pointermove', { x: 230, y: 230, pointerId: 71, pointerType })
    pointer(sauceBin, 'pointerup', { x: 230, y: 230, pointerId: 71, pointerType })

    expect(sauceBin.getAttribute('aria-pressed')).toBe('true')
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'DROP_INGREDIENT', ingredient: 'sauce' }))
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'COMPLETE_GESTURE', gesture: expect.objectContaining({ kind: 'sauce' }) }))

    const target = container.querySelector<HTMLElement>('[data-gesture-slot-id="left"]')!
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(bounds(0, 0, 100, 100))
    const path = tutorialGesturePath('sauce').map((point) => ({
      x: point.x / TUTORIAL_GESTURE_RECT.width * 100,
      y: point.y / TUTORIAL_GESTURE_RECT.height * 100,
    }))
    const stroke = (pointerId: number) => {
      pointer(target, 'pointerdown', { ...path[0], pointerId, pointerType })
      path.slice(1, -1).forEach((point) => pointer(target, 'pointermove', { ...point, pointerId, pointerType }))
      pointer(target, 'pointerup', { ...path.at(-1), pointerId, pointerType })
    }
    stroke(72)
    stroke(73)

    const sauceActions = dispatch.mock.calls
      .map(([action]) => action)
      .filter((action): action is Extract<KitchenAction, { type: 'COMPLETE_GESTURE' }> => action.type === 'COMPLETE_GESTURE' && action.gesture.kind === 'sauce')
    expect(sauceActions).toHaveLength(2)
    const afterFirst = kitchenReducer(sauceState, sauceActions[0])
    expect(afterFirst.slots[0].completedStepIds).not.toContain('sauce')
    expect(afterFirst.slots[0].sauceStrokeCount).toBe(1)
    const afterSecond = kitchenReducer(afterFirst, sauceActions[1])
    expect(afterSecond.slots[0].completedStepIds).toContain('sauce')
    expect(afterSecond.slots[0].sauceStrokeCount).toBe(2)
  })

  it('supports keyboard ingredient application to the first eligible griddle', () => {
    const { container, dispatch } = renderScene(activeKitchenState(1, 1))
    const noodle = container.querySelector<HTMLElement>('[data-ingredient-id="noodle"]')!
    act(() => noodle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenCalledWith({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
  })

  it('routes keyboard Enter and Space through first and second noodle/egg recipe steps', () => {
    const start = activeKitchenState(2, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'assembling', orderId: start.customers[0].order.id, recipeId: 'big-eater', completedStepIds: [],
    }
    const { container, dispatch, rerender } = renderScene({ ...start, slots })
    const noodle = container.querySelector<HTMLElement>('[data-ingredient-id="noodle"]')!

    act(() => noodle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenCalledWith({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })

    const afterFirstNoodle = kitchenReducer({ ...start, slots }, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    const readyForFirstEgg = { ...afterFirstNoodle, slots: [{ ...afterFirstNoodle.slots[0], phase: 'assembling' as const, heatState: 'ready' as const }, afterFirstNoodle.slots[1]] as KitchenState['slots'] }
    rerender(readyForFirstEgg)
    const egg = container.querySelector<HTMLElement>('[data-ingredient-id="egg"]')!
    act(() => egg.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'TAP_EGG', slotId: 'left' })

    const afterFirstEgg = kitchenReducer(readyForFirstEgg, { type: 'TAP_EGG', slotId: 'left' })
    const readyForSecondNoodle = { ...afterFirstEgg, slots: [{ ...afterFirstEgg.slots[0], phase: 'assembling' as const, heatState: 'ready' as const }, afterFirstEgg.slots[1]] as KitchenState['slots'] }
    rerender(readyForSecondNoodle)
    act(() => noodle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })

    const afterSecondNoodle = kitchenReducer(readyForSecondNoodle, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    rerender(afterSecondNoodle)
    act(() => egg.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'TAP_EGG', slotId: 'left' })

    const afterSecondEgg = kitchenReducer(afterSecondNoodle, { type: 'TAP_EGG', slotId: 'left' })
    expect(afterSecondEgg.slots[0].completedStepIds).toEqual(['noodle', 'egg', 'second-noodle', 'second-egg'])
  })

  it('supports keyboard completion for sauce strokes, cuts, and rolling', () => {
    const start = createKitchenState(1, 1)
    const stateFor = (completedStepIds: string[], cutTargetIndices: number[] = []) => ({
      ...start,
      slots: [{ ...start.slots[0], phase: 'gesturing' as const, recipeId: 'classic' as const, orderId: start.customers[0].order.id, completedStepIds, cutTargetIndices }, start.slots[1]] as KitchenState['slots'],
    })
    const { container, dispatch, rerender } = renderScene(stateFor(['noodle', 'egg', 'hot-dog']))
    act(() => container.querySelector<HTMLElement>('[data-ingredient-id="sauce"]')!.click())
    act(() => container.querySelector<HTMLElement>('[data-gesture-slot-id="left"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'COMPLETE_GESTURE', gesture: expect.objectContaining({ kind: 'sauce', complete: true }) }))

    rerender(stateFor(['noodle', 'egg', 'hot-dog', 'sauce', 'scallion']))
    act(() => container.querySelector<HTMLElement>('[data-gesture-slot-id="left"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ gesture: expect.objectContaining({ kind: 'cut', targetIndex: 0, complete: true }) }))

    rerender(stateFor(['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut'], [0, 1, 2]))
    act(() => container.querySelector<HTMLElement>('[data-gesture-slot-id="left"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenLastCalledWith(expect.objectContaining({ gesture: expect.objectContaining({ kind: 'roll', complete: true }) }))
  })

  it('delivers a tray dish to its intended active customer with Enter', () => {
    const start = activeKitchenState(1, 1)
    const state = { ...start, slots: [{ ...start.slots[0], phase: 'on-tray' as const, recipeId: start.customers[0].order.recipeId, orderId: start.customers[0].order.id }, start.slots[1]] as KitchenState['slots'] }
    const { container, dispatch } = renderScene(state)
    act(() => container.querySelector<HTMLElement>('[data-tray-slot-id="left"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(dispatch).toHaveBeenCalledWith({ type: 'DELIVER', slotId: 'left', customerId: start.customers[0].id })
  })

  it('renders the tested guided SVG for brush pickup, the next unique cut, and roll', () => {
    const start = activeKitchenState(1, 1, true)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'gesturing', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog'],
    }
    const { container, rerender } = renderScene({ ...start, slots })

    expect(container.querySelector('[data-tutorial-path="sauce"]')).not.toBeNull()
    expect(container.textContent).toContain('先拿起酱刷')

    const cutSlots = [...slots] as KitchenState['slots']
    cutSlots[0] = {
      ...cutSlots[0],
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'],
      cutTargetIndices: [1],
    }
    rerender({ ...start, slots: cutSlots })
    expect(container.querySelector('[data-tutorial-path="cut"][data-cut-target-index="0"]')).not.toBeNull()
    expect(container.querySelector('[data-cut-mark-index="1"].is-done')).not.toBeNull()

    const rollSlots = [...cutSlots] as KitchenState['slots']
    rollSlots[0] = {
      ...rollSlots[0],
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut'],
      cutTargetIndices: [0, 1, 2],
    }
    rerender({ ...start, slots: rollSlots })
    expect(container.querySelector('[data-tutorial-path="roll"]')).not.toBeNull()
  })

  it('aligns the gesture tool to logical coordinates in a scaled scene', () => {
    const start = createKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'gesturing', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'],
    }
    const { container } = renderScene({ ...start, slots })
    const scene = container.querySelector('.kitchen-scene')!
    const gestureTarget = container.querySelector('[data-gesture-slot-id="left"]')!
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(bounds(100, 50, 720, 405))
    vi.spyOn(gestureTarget, 'getBoundingClientRect').mockReturnValue(bounds(345, 289, 135, 94))

    pointer(gestureTarget, 'pointerdown', { x: 350, y: 300, pointerId: 42 })
    pointer(gestureTarget, 'pointermove', { x: 460, y: 185, pointerId: 42 })

    const tool = container.querySelector<HTMLElement>('.cooking-gesture-tool')!
    expect(tool.style.left).toBe('720px')
    expect(tool.style.top).toBe('270px')
  })

  it('delivers tray dishes to the customer actor under the release point', () => {
    const start = activeKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'on-tray', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
      sauceCoverage: 1, cutTargetIndices: [0, 1, 2], rollProgress: 1,
    }
    const { container, dispatch } = renderScene({ ...start, slots })
    const dish = container.querySelector('[data-tray-slot-id="left"]')!
    const customer = container.querySelector('[data-customer-id="customer-0"]')!
    vi.spyOn(customer, 'getBoundingClientRect').mockReturnValue(bounds(300, 100, 100, 200))

    pointer(dish, 'pointerdown', { x: 10, y: 10, pointerId: 10 })
    pointer(dish, 'pointermove', { x: 320, y: 150, pointerId: 10 })
    pointer(dish, 'pointerup', { x: 320, y: 150, pointerId: 10 })

    expect(dispatch).toHaveBeenCalledWith({ type: 'DELIVER', slotId: 'left', customerId: 'customer-0' })
  })

  it.each([
    ['mouse', 'entering'],
    ['touch', 'entering'],
    ['mouse', 'leaving'],
    ['touch', 'leaving'],
  ] as const)('does not deliver a %s tray drop to a %s customer', (pointerType, presence) => {
    const active = activeKitchenState(1, 1)
    const slots = [...active.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'on-tray', orderId: active.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
      sauceCoverage: 1, cutTargetIndices: [0, 1, 2], rollProgress: 1,
    }
    const state = {
      ...active,
      slots,
      customers: active.customers.map((customer, index) => index === 0
        ? { ...customer, presence }
        : customer),
    }
    const { container, dispatch } = renderScene(state)
    const dish = container.querySelector('[data-tray-slot-id="left"]')!
    const customer = container.querySelector('[data-customer-id="customer-0"]')!
    vi.spyOn(customer, 'getBoundingClientRect').mockReturnValue(bounds(300, 100, 100, 200))

    pointer(dish, 'pointerdown', { x: 10, y: 10, pointerId: 70, pointerType })
    pointer(dish, 'pointermove', { x: 320, y: 150, pointerId: 70, pointerType })
    pointer(dish, 'pointerup', { x: 320, y: 150, pointerId: 70, pointerType })

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('aligns the serving ghost to logical coordinates in a scaled scene', () => {
    const start = createKitchenState(1, 1)
    const slots = [...start.slots] as KitchenState['slots']
    slots[0] = {
      ...slots[0], phase: 'on-tray', orderId: start.customers[0].order.id, recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
      sauceCoverage: 1, cutTargetIndices: [0, 1, 2], rollProgress: 1,
    }
    const { container } = renderScene({ ...start, slots })
    const scene = container.querySelector('.kitchen-scene')!
    const dish = container.querySelector('[data-tray-slot-id="left"]')!
    vi.spyOn(scene, 'getBoundingClientRect').mockReturnValue(bounds(100, 50, 720, 405))

    pointer(dish, 'pointerdown', { x: 110, y: 60, pointerId: 43 })
    pointer(dish, 'pointermove', { x: 460, y: 185, pointerId: 43 })

    const ghost = container.querySelector<HTMLElement>('.serving-tray__ghost')!
    expect(ghost.style.left).toBe('720px')
    expect(ghost.style.top).toBe('270px')
  })

  it('offers direct discard buttons for both occupied slots', () => {
    let state = activeKitchenState(1, 4)
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    const { container, dispatch } = renderScene(state)
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-discard-slot-id]')]

    expect(buttons).toHaveLength(2)
    act(() => buttons.forEach((button) => button.click()))

    expect(dispatch).toHaveBeenCalledWith({ type: 'DISCARD_SLOT', slotId: 'left' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'DISCARD_SLOT', slotId: 'right' })
  })

  it('keeps the compact heat ring and adds readable raw, ready, scorched, and burnt status', () => {
    let state = activeKitchenState(1, 5)
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = kitchenReducer(state, { type: 'TAP_EGG', slotId: 'left' })
    const { container, rerender } = renderScene(state)

    expect(container.querySelector('.griddle-slot--left .griddle-slot__heat-ring')).not.toBeNull()
    expect(container.querySelectorAll('.griddle-slot--left .griddle-slot__oil i')).toHaveLength(4)
    expect(container.querySelectorAll('.griddle-slot--left .griddle-slot__steam i')).toHaveLength(3)
    expect(container.querySelector('.griddle-slot__heat')).toBeNull()
    expect(container.querySelector('.griddle-slot--left .griddle-slot__status')?.textContent).toBe('正在煎…')

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 4_000 })
    rerender(state)
    expect(container.querySelector('.griddle-slot--left .griddle-slot__status')?.textContent).toContain('火候正好')

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 8_000 })
    rerender(state)
    expect(container.querySelector('.griddle-slot--left .griddle-slot__status')?.textContent).toBe('快焦了！马上操作')

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 2_000 })
    rerender(state)
    expect(container.querySelector('.griddle-slot--left .griddle-slot__status')?.textContent).toBe('已经焦了')
  })

  it('guides every protected first-order step and disables unrelated tabletop Pointer Events', () => {
    let state = createKitchenState(1, 8, 0, true)
    const { container, dispatch, rerender } = renderScene(state)
    const hotDog = container.querySelector('[data-ingredient-id="hot-dog"]')!
    const noodle = container.querySelector('[data-ingredient-id="noodle"]')!
    const leftSlot = container.querySelector('[data-slot-id="left"]')!
    vi.spyOn(leftSlot, 'getBoundingClientRect').mockReturnValue(bounds(200, 200, 100, 100))

    expect(container.querySelector('[data-tutorial-step="customer-arrival"]')).not.toBeNull()
    expect(noodle.hasAttribute('disabled')).toBe(true)
    expect(hotDog.hasAttribute('disabled')).toBe(true)
    expect(container.querySelector('[data-ingredient-id="egg"]')?.hasAttribute('disabled')).toBe(true)
    expect(container.querySelector('[data-ingredient-id="sauce"]')?.hasAttribute('disabled')).toBe(true)

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 1_700 })
    rerender(state)
    expect(container.querySelector('[data-tutorial-step="noodle"]')).not.toBeNull()
    expect(noodle.hasAttribute('disabled')).toBe(false)

    pointer(hotDog, 'pointerdown', { x: 10, y: 10, pointerId: 30 })
    pointer(hotDog, 'pointermove', { x: 230, y: 230, pointerId: 30 })
    pointer(hotDog, 'pointerup', { x: 230, y: 230, pointerId: 30 })
    expect(dispatch).not.toHaveBeenCalled()
    expect(container.querySelector('.table-ingredient__ghost')).toBeNull()

    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    rerender(state)
    expect(container.querySelector('[data-tutorial-step="egg"]')).not.toBeNull()
    expect(container.querySelector('[data-ingredient-id="noodle"]')?.hasAttribute('disabled')).toBe(true)
    expect(container.querySelector('[data-ingredient-id="egg"]')?.hasAttribute('disabled')).toBe(false)
    expect(container.querySelector('[data-discard-slot-id]')).toBeNull()

    state = kitchenReducer(state, { type: 'TAP_EGG', slotId: 'left' })
    rerender(state)
    expect(container.querySelector('[data-tutorial-step="wait-egg"]')).not.toBeNull()
    expect(container.textContent).toContain('鸡蛋正在煎')

    state = kitchenReducer(state, { type: 'TICK', deltaMs: 60_000 })
    rerender(state)
    expect(container.querySelector('[data-tutorial-step="hot-dog"]')).not.toBeNull()
    expect(container.textContent).toContain('煎好啦，拖入热狗')
    expect(container.querySelector('[data-ingredient-id="hot-dog"]')?.hasAttribute('disabled')).toBe(false)

    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
    state = kitchenReducer(state, { type: 'TICK', deltaMs: 60_000 })
    rerender(state)
    expect(container.querySelector('[data-tutorial-step="sauce"]')).not.toBeNull()
    expect(container.textContent).toContain('拿起酱刷')
    expect(container.querySelector('[data-ingredient-id="sauce"]')?.hasAttribute('disabled')).toBe(false)
  })

  it('shows the first-order completion confirmation for one stable transition window without restoring guided restrictions', () => {
    vi.useFakeTimers()
    const guided = activeKitchenState(1, 18, true)
    const traySlots = [...guided.slots] as KitchenState['slots']
    traySlots[0] = {
      ...traySlots[0],
      phase: 'on-tray',
      orderId: guided.customers[0].order.id,
      recipeId: 'classic',
      completedStepIds: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
      sauceCoverage: 1,
      cutTargetIndices: [0, 1, 2],
      rollProgress: 1,
    }
    const beforeDelivery = { ...guided, slots: traySlots }
    const completed = kitchenReducer(beforeDelivery, {
      type: 'DELIVER', slotId: 'left', customerId: guided.customers[0].id,
    })
    const { container, rerender } = renderScene(beforeDelivery)

    expect(container.querySelector('.tutorial-completion-toast')).toBeNull()
    rerender(completed)

    const toast = container.querySelector('.tutorial-completion-toast')
    expect(toast?.textContent).toBe('第一份完成！现在可以同时服务顾客了')
    expect(container.querySelector('.kitchen-scene')?.hasAttribute('data-guided-tutorial')).toBe(false)
    expect(container.querySelectorAll<HTMLButtonElement>('[data-ingredient-id]:disabled')).toHaveLength(0)
    expect(container.querySelector('[data-ingredient-id="cilantro"]')).toBeNull()
    expect(container.querySelectorAll('[data-customer-id]')).toHaveLength(3)

    act(() => vi.advanceTimersByTime(2_199))
    expect(container.querySelector('.tutorial-completion-toast')).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('.tutorial-completion-toast')).toBeNull()
  })

  it('keeps normal Day 3 ingredients and both occupied griddles interactive', () => {
    let state = activeKitchenState(3, 8)
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
    state = kitchenReducer(state, { type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
    const { container } = renderScene(state)

    expect(container.querySelectorAll('[data-customer-id]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-slot-id]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-discard-slot-id]')).toHaveLength(2)
    expect(container.querySelectorAll<HTMLButtonElement>('[data-ingredient-id]:disabled')).toHaveLength(0)
  })
})
