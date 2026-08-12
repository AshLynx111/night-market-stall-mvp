import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function pointer(target: Element, type: string, { x = 0, y = 0, pointerId = 1 } = {}) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: 'mouse' },
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

function setRangeValue(target: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(target, value)
  target.dispatchEvent(new Event('input', { bubbles: true }))
}

afterEach(() => {
  window.history.replaceState({}, '', '/')
  localStorage.clear()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('App landscape route', () => {
  it('starts an unfinished Day 1 with one guided customer', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=1')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const session = container.querySelector<HTMLElement>('[data-kitchen-tutorial-mode]')
    expect(session?.dataset.kitchenTutorialMode).toBe('guided-first-order')
    expect(session?.dataset.kitchenCustomerCount).toBe('1')
    expect(container.querySelectorAll('[data-customer-art-id]')).toHaveLength(1)
    act(() => root.unmount())
  })

  it('replays Day 1 normally after the versioned guided tutorial is complete', () => {
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=1')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const session = container.querySelector<HTMLElement>('[data-kitchen-tutorial-mode]')
    expect(session?.dataset.kitchenTutorialMode).toBe('off')
    expect(session?.dataset.kitchenCustomerCount).toBe('3')
    expect(container.querySelectorAll('[data-customer-art-id]')).toHaveLength(3)
    act(() => root.unmount())
  })

  it('never enables the guided tutorial on later days', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=2')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const session = container.querySelector<HTMLElement>('[data-kitchen-tutorial-mode]')
    expect(session?.dataset.kitchenTutorialMode).toBe('off')
    expect(session?.dataset.kitchenCustomerCount).toBe('3')
    act(() => root.unmount())
  })

  it('renders the LandscapeGame campaign shell instead of the legacy game loop', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector('.home-screen')).not.toBeNull()
    expect(container.querySelector('.home-screen__art')).not.toBeNull()
    expect(container.querySelectorAll('.home-hotspot')).toHaveLength(5)
    expect(container.querySelector<HTMLImageElement>('.home-screen__art')?.src).toContain('home-screen-user-final')
    expect(container.querySelector('.game-shell')).toBeNull()

    act(() => root.unmount())
  })

  it('provides persistent settings controls without replacing the gameplay help action', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    localStorage.setItem('night-market-audio-settings-v1', JSON.stringify({
      master: 2,
      music: -1,
      effects: 0.4,
      musicMuted: false,
    }))
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelectorAll('.home-hotspot')).toHaveLength(5)
    const homeMusic = container.querySelector<HTMLButtonElement>('[aria-label="背景音乐"]')!
    expect(homeMusic.getAttribute('aria-pressed')).toBe('false')
    act(() => homeMusic.click())
    expect(homeMusic.getAttribute('aria-pressed')).toBe('true')

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="打开设置"]')!.click())
    expect(container.querySelector('[data-screen-art="settings"]')).not.toBeNull()
    const sliders = [...container.querySelectorAll<HTMLInputElement>('input[type="range"]')]
    expect(sliders.map((slider) => slider.getAttribute('aria-label'))).toEqual(['总音量', '背景音乐音量', '音效音量'])
    expect(sliders.map((slider) => slider.value)).toEqual(['1', '0', '0.4'])

    const settingsMusic = container.querySelector<HTMLButtonElement>('.settings-screen__music-toggle')!
    expect(settingsMusic.getAttribute('aria-pressed')).toBe('true')
    act(() => settingsMusic.click())
    expect(settingsMusic.getAttribute('aria-pressed')).toBe('false')
    expect(JSON.parse(localStorage.getItem('night-market-audio-settings-v1')!).musicMuted).toBe(false)

    act(() => {
      setRangeValue(sliders[1], '0.35')
    })
    expect(JSON.parse(localStorage.getItem('night-market-audio-settings-v1')!).music).toBe(0.35)

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="返回主菜单"]')!.click())
    expect(container.querySelector('.home-screen')).not.toBeNull()
    expect(container.querySelector<HTMLButtonElement>('[aria-label="背景音乐"]')?.getAttribute('aria-pressed')).toBe('false')

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="开始游戏"]')!.click())
    act(() => container.querySelector<HTMLButtonElement>('.help-fab')!.click())
    expect(container.querySelector('[role="dialog"][aria-label="玩法说明"]')).not.toBeNull()
    expect(container.querySelector('[data-screen-art="settings"]')).toBeNull()
    act(() => root.unmount())
  })

  it('renders the approved art marker for each campaign screen', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector('[data-screen-art="home"]')).not.toBeNull()

    const select = container.querySelector<HTMLButtonElement>('[aria-label="查看关卡与成就"]')!
    act(() => select.click())
    expect(container.querySelector('[data-screen-art="select"]')).not.toBeNull()

    const back = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('返回'))!
    act(() => back.click())
    const settings = container.querySelector<HTMLButtonElement>('[aria-label="打开设置"]')!
    act(() => settings.click())
    expect(container.querySelector('[data-screen-art="settings"]')).not.toBeNull()
    act(() => root.unmount())

    window.history.replaceState({}, '', '/?playDay=1')
    const kitchenContainer = document.createElement('div')
    const kitchenRoot = createRoot(kitchenContainer)
    act(() => kitchenRoot.render(<App />))
    expect(kitchenContainer.querySelector('[data-screen-art="kitchen"]')).not.toBeNull()
    act(() => kitchenRoot.unmount())

    window.history.replaceState({}, '', '/?playDay=1&qaScreen=summary')
    const summaryContainer = document.createElement('div')
    const summaryRoot = createRoot(summaryContainer)
    act(() => summaryRoot.render(<App />))
    expect(summaryContainer.querySelector('[data-screen-art="summary"]')).not.toBeNull()
    act(() => summaryRoot.unmount())
  })

  it('binds each rendered approved screen surface to its matching image URL', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector<HTMLImageElement>('[data-screen-art="home"] .home-screen__art')?.src)
      .toContain('home-screen-user-final.png')

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="查看关卡与成就"]')!.click())
    expect(container.querySelector<HTMLElement>('[data-screen-art="select"]')?.style.getPropertyValue('--home-bg'))
      .toContain('day-select-user-final.png')

    act(() => [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('返回'))!.click())
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="打开设置"]')!.click())
    const settingsPlate = container.querySelector<HTMLImageElement>('[data-screen-art="settings"]')
    expect(settingsPlate?.src).toContain('settings-screen-user-final.png')
    expect(settingsPlate?.classList.contains('settings-screen__art')).toBe(true)
    expect(settingsPlate?.parentElement?.classList.contains('settings-screen__plate')).toBe(true)
    expect(settingsPlate?.closest('.settings-screen')).not.toBeNull()
    act(() => root.unmount())

    window.history.replaceState({}, '', '/?playDay=1')
    const kitchenContainer = document.createElement('div')
    const kitchenRoot = createRoot(kitchenContainer)
    act(() => kitchenRoot.render(<App />))
    expect(kitchenContainer.querySelector<HTMLImageElement>('[data-screen-art="kitchen"] .game-screen__background')?.src)
      .toContain('kitchen-screen-user-final.png')
    act(() => kitchenRoot.unmount())

    window.history.replaceState({}, '', '/?playDay=1&qaScreen=summary')
    const summaryContainer = document.createElement('div')
    const summaryRoot = createRoot(summaryContainer)
    act(() => summaryRoot.render(<App />))
    expect(summaryContainer.querySelector<HTMLElement>('[data-screen-art="summary"]')?.style.getPropertyValue('--home-bg'))
      .toContain('summary-screen-user-final.png')
    act(() => summaryRoot.unmount())
  })

  it('keeps the home to level-select path operable and locks five days for a blank campaign', () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const select = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '选择关卡')!
    act(() => select.click())

    expect(container.querySelector('.select-screen')).not.toBeNull()
    expect(container.querySelectorAll('.day-card')).toHaveLength(6)
    expect(container.querySelectorAll<HTMLButtonElement>('.day-card:disabled')).toHaveLength(5)
    expect(container.querySelectorAll('.day-card:disabled .day-card__lock[aria-hidden="true"]')).toHaveLength(5)
    expect([...container.querySelectorAll('button')].some((button) => button.textContent?.includes('返回'))).toBe(true)
    act(() => root.unmount())
  })

  it('uses the approved selection plate as six accessible campaign hit targets with real progress and upgrades', () => {
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({
      coins: 84,
      fireLevel: 1,
      signLevel: 0,
      bestStars: { 1: 3, 2: 2, 3: 1 },
      maxUnlockedDay: 6,
    }))
    window.history.replaceState({}, '', '/?qaScreen=select')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const plate = container.querySelector('.select-screen__plate')
    expect(plate?.querySelector<HTMLImageElement>('.select-screen__art')?.src)
      .toContain('day-select-user-final.png')
    const days = [...container.querySelectorAll<HTMLButtonElement>('.day-hotspot')]
    expect(days).toHaveLength(6)
    expect(days.map((button) => button.getAttribute('aria-label'))).toEqual([
      '进入第 1 天：开张第一天',
      '进入第 2 天：饭量挑战',
      '进入第 3 天：香味出圈',
      '进入第 4 天：夜市高峰',
      '第 5 天尚未解锁，完成前一天后解锁',
      '第 6 天尚未解锁，完成前一天后解锁',
    ])
    expect(days.map((button) => button.disabled)).toEqual([false, false, false, false, true, true])
    expect([...container.querySelectorAll('.day-hotspot__stars')].map((stars) => stars.textContent))
      .toEqual(['★★★', '★★☆', '★☆☆', '☆☆☆', '☆☆☆', '☆☆☆'])
    expect(container.querySelectorAll('[data-dynamic-mask="parchment"]')).toHaveLength(10)

    act(() => days[4].click())
    expect(container.querySelector('.select-screen')).not.toBeNull()

    const fire = container.querySelector<HTMLButtonElement>('[aria-label="升级火力"]')!
    expect(fire.textContent).toContain('升级火力 Lv.2')
    expect(fire.textContent).toContain('¥80')
    act(() => fire.click())
    expect(container.querySelector('[data-upgrade-funds]')?.textContent).toContain('¥ 4')
    expect(container.querySelector<HTMLButtonElement>('[aria-label="升级火力"]')?.disabled).toBe(true)
    expect(container.querySelector<HTMLButtonElement>('[aria-label="升级火力"]')?.textContent).toContain('已经满级')

    act(() => container.querySelector<HTMLButtonElement>('[aria-label="返回主菜单"]')!.click())
    expect(container.querySelector('.home-screen')).not.toBeNull()
    act(() => root.unmount())
  })

  it('renders real Day 1 summary values on the plate and keeps replay and next-day actions live', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=1&qaScreen=summary')
    const replayContainer = document.createElement('div')
    const replayRoot = createRoot(replayContainer)
    act(() => replayRoot.render(<App />))

    expect(replayContainer.querySelector<HTMLImageElement>('.summary-screen__art')?.src)
      .toContain('summary-screen-user-final.png')
    expect(replayContainer.querySelector('.summary-title')?.textContent).toBe('开张第一天 · 营业完成')
    expect(replayContainer.querySelector('.summary-stars')?.textContent).toBe('★★★')
    expect([...replayContainer.querySelectorAll('.summary-stat__value')].map((value) => value.textContent))
      .toEqual(['3', '92%', '0', '¥36'])
    expect(replayContainer.querySelectorAll('[data-dynamic-mask="parchment"]')).toHaveLength(7)
    act(() => replayContainer.querySelector<HTMLButtonElement>('[aria-label="再玩一次"]')!.click())
    expect(replayContainer.querySelector('[data-screen-art="kitchen"]')).not.toBeNull()
    expect(replayContainer.textContent).toContain('第 1 天')
    act(() => replayRoot.unmount())

    localStorage.setItem('night-market-campaign-v1', JSON.stringify({ bestStars: { 1: 3 } }))
    window.history.replaceState({}, '', '/?playDay=1&qaScreen=summary')
    const nextContainer = document.createElement('div')
    const nextRoot = createRoot(nextContainer)
    act(() => nextRoot.render(<App />))
    act(() => nextContainer.querySelector<HTMLButtonElement>('[aria-label="进入下一天"]')!.click())
    expect(nextContainer.querySelector('[data-screen-art="kitchen"]')).not.toBeNull()
    expect(nextContainer.textContent).toContain('第 2 天')
    act(() => nextRoot.unmount())
  })

  it('renders the Day 6 summary state and returns to selection from the final action', () => {
    window.history.replaceState({}, '', '/?playDay=6&qaScreen=summary')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector('.summary-title')?.textContent).toBe('明星同款 · 营业完成')
    expect([...container.querySelectorAll('.summary-stat__value')].map((value) => value.textContent))
      .toEqual(['8', '92%', '0', '¥36'])
    const finalAction = container.querySelector<HTMLButtonElement>('[aria-label="返回选关"]')!
    expect(finalAction.textContent).toContain('返回选关')
    act(() => finalAction.click())
    expect(container.querySelector('.select-screen__plate')).not.toBeNull()
    act(() => root.unmount())
  })

  it('sanitizes malformed saved stars before rendering cards or calculating locks', () => {
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({
      maxUnlockedDay: 6,
      bestStars: { 1: '3', 2: true, 3: -1, 4: 1.5, 5: 4, 6: null },
    }))
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const select = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '选择关卡')!
    act(() => select.click())

    expect(container.querySelectorAll<HTMLButtonElement>('.day-card:disabled')).toHaveLength(5)
    expect([...container.querySelectorAll('.day-card__stars')].map((stars) => stars.textContent))
      .toEqual(Array(6).fill('☆☆☆'))
    act(() => root.unmount())
  })

  it('ignores QA day and summary fixtures in a production-like empty campaign', () => {
    vi.stubEnv('DEV', false)
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=6&qaScreen=summary')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector('.home-screen')).not.toBeNull()
    expect(container.querySelector('.summary-screen')).toBeNull()
    expect(container.textContent).not.toContain('明星同款 · 营业完成')
    act(() => root.unmount())
  })

  it('migrates falsely unlocked saves and enables only settled consecutive days', () => {
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({ maxUnlockedDay: 6, bestStars: {} }))
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    const select = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '选择关卡')!
    act(() => select.click())
    expect(container.querySelectorAll<HTMLButtonElement>('.day-card:disabled')).toHaveLength(5)
    act(() => root.unmount())

    localStorage.setItem('night-market-campaign-v1', JSON.stringify({ bestStars: { 1: 3 }, maxUnlockedDay: 6 }))
    const settledContainer = document.createElement('div')
    const settledRoot = createRoot(settledContainer)
    act(() => settledRoot.render(<App />))
    const settledSelect = [...settledContainer.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '选择关卡')!
    act(() => settledSelect.click())
    expect(settledContainer.querySelectorAll<HTMLButtonElement>('.day-card:disabled')).toHaveLength(4)
    expect(settledContainer.querySelector<HTMLButtonElement>('.day-card--1')?.disabled).toBe(false)
    expect(settledContainer.querySelector<HTMLButtonElement>('.day-card--2')?.disabled).toBe(false)
    act(() => settledRoot.unmount())
  })

  it('confirms abandonment before returning to selection and starts a fresh kitchen session', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=1&qaServedOrders=2')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.textContent).toContain('完成订单 2/3')
    const returnHome = container.querySelector<HTMLButtonElement>('[aria-label="返回主页"]')!
    act(() => returnHome.click())
    expect(container.querySelector('.select-screen')).toBeNull()
    expect(container.textContent).toContain('放弃本次营业')
    const abandon = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === '放弃本次营业')!
    act(() => abandon.click())
    expect(container.querySelector('.select-screen')).not.toBeNull()

    const dayOne = container.querySelector<HTMLButtonElement>('.day-card--1')!
    act(() => dayOne.click())
    expect(container.textContent).toContain('完成订单 0/3')
    expect(container.querySelectorAll('[data-slot-id]')).toHaveLength(2)
    act(() => root.unmount())
  })

  it('moves focus into abandonment confirmation, traps Tab, blocks background actions, and restores focus on both close paths', () => {
    const callbacks = new Map<number, FrameRequestCallback>()
    let nextFrameId = 0
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrameId += 1
      callbacks.set(nextFrameId, callback)
      return nextFrameId
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=2')
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => root.render(<App />))

    act(() => {
      for (let frame = 1; frame <= 18; frame += 1) callbacks.get(frame)?.((frame - 1) * 100)
    })

    const leftSlot = container.querySelector<HTMLElement>('[data-slot-id="left"]')!
    vi.spyOn(leftSlot, 'getBoundingClientRect').mockReturnValue(bounds(200, 200, 100, 100))
    const noodle = container.querySelector('[data-ingredient-id="noodle"]')!
    pointer(noodle, 'pointerdown', { x: 10, y: 10, pointerId: 71 })
    pointer(noodle, 'pointermove', { x: 230, y: 230, pointerId: 71 })
    pointer(noodle, 'pointerup', { x: 230, y: 230, pointerId: 71 })
    expect(leftSlot.dataset.expectedStepId).toBe('egg')

    const returnHome = container.querySelector<HTMLButtonElement>('[aria-label="返回主页"]')!
    act(() => {
      returnHome.focus()
      returnHome.click()
    })
    const dialog = container.querySelector<HTMLElement>('[role="dialog"][aria-label="放弃本次营业确认"]')!
    const game = container.querySelector<HTMLElement>('.game-screen')!
    const dialogButtons = [...dialog.querySelectorAll<HTMLButtonElement>('button')]

    expect(game.hasAttribute('inert')).toBe(true)
    expect(game.getAttribute('aria-hidden')).toBe('true')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(dialogButtons[0])

    const egg = container.querySelector('[data-ingredient-id="egg"]')!
    pointer(egg, 'pointerdown', { pointerId: 72 })
    pointer(egg, 'pointerup', { pointerId: 72 })
    expect(leftSlot.dataset.expectedStepId).toBe('egg')
    expect(leftSlot.classList.contains('heat-raw')).toBe(false)

    act(() => {
      dialogButtons.at(-1)?.focus()
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(document.activeElement).toBe(dialogButtons[0])
    act(() => {
      dialogButtons[0].focus()
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })
    expect(document.activeElement).toBe(dialogButtons.at(-1))

    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(container.querySelector('[aria-label="放弃本次营业确认"]')).toBeNull()
    expect(document.activeElement).toBe(returnHome)
    expect(game.hasAttribute('inert')).toBe(false)

    act(() => returnHome.click())
    const continueButton = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="放弃本次营业确认"] button')]
      .find((button) => button.textContent === '继续营业')!
    act(() => continueButton.click())
    expect(container.querySelector('[aria-label="放弃本次营业确认"]')).toBeNull()
    expect(document.activeElement).toBe(returnHome)

    act(() => root.unmount())
  })

  it('supports narrow-layout event and summary fixtures and schedules the celebrity without replacing a live customer', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    window.history.replaceState({}, '', '/?playDay=5&qaScreen=event')
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<App />))

    expect(container.querySelector('.event-screen--overlay')).not.toBeNull()
    const originalOrderIds = [...container.querySelectorAll<HTMLElement>('[data-customer-id]')]
      .map((customer) => customer.dataset.orderId)
    const resume = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('马上为你做'))!
    act(() => resume.click())

    expect(container.querySelector('.event-screen--overlay')).toBeNull()
    expect(container.querySelector('[data-customer-art-id="celebrity"]')).toBeNull()
    expect([...container.querySelectorAll<HTMLElement>('[data-customer-id]')].map((customer) => customer.dataset.orderId))
      .toEqual(originalOrderIds)
    act(() => root.unmount())

    window.history.replaceState({}, '', '/?playDay=5&qaScreen=summary')
    const summaryContainer = document.createElement('div')
    const summaryRoot = createRoot(summaryContainer)
    act(() => summaryRoot.render(<App />))
    expect(summaryContainer.querySelector('.summary-screen')).not.toBeNull()
    expect(summaryContainer.querySelectorAll('.summary-actions button')).toHaveLength(2)
    act(() => summaryRoot.unmount())
  })
})
