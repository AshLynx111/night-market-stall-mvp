import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { I18nProvider } from './I18nProvider'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function renderEnglish(path: string) {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  window.history.replaceState({}, '', path)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<I18nProvider locale="en"><App /></I18nProvider>))
  return { container, root }
}

function ensureDescriptionMeta() {
  const meta = document.createElement('meta')
  meta.name = 'description'
  document.head.append(meta)
  return meta
}

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  localStorage.clear()
  document.documentElement.removeAttribute('data-locale')
  document.documentElement.lang = ''
  document.title = ''
  document.querySelector('meta[name="description"]')?.remove()
  document.body.replaceChildren()
})

describe('English campaign presentation', () => {
  it('renders the home and settings controls in English', () => {
    const { container, root } = renderEnglish('/?lang=en')
    expect(container.querySelector('.home-screen')?.textContent).toContain('Start')
    expect(container.querySelector('.home-screen__locale-title')?.textContent)
      .toBe('Night MarketStreet Food Stall')
    expect(container.querySelector('.home-screen__locale-title')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector<HTMLButtonElement>('.home-hotspot--settings')?.ariaLabel).toBe('Open settings')

    act(() => container.querySelector<HTMLButtonElement>('.home-hotspot--settings')!.click())
    expect(container.querySelector('.settings-screen')?.textContent).toContain('Master Volume')
    expect(container.querySelector('.settings-screen__game-title')?.textContent)
      .toBe('Night MarketStreet Food Stall')
    expect(container.querySelector('.settings-screen__game-title')?.getAttribute('aria-hidden')).toBe('true')
    expect([...container.querySelectorAll<HTMLInputElement>('input[type="range"]')].map((input) => input.ariaLabel))
      .toEqual(['Master volume', 'Music volume', 'Sound effects volume'])
    act(() => root.unmount())
  })

  it('renders day selection copy from stable day ids', () => {
    const { container, root } = renderEnglish('/?lang=en&qaScreen=select')
    const screen = container.querySelector('.select-screen')!
    expect(screen.textContent).toContain('Select a Day')
    expect(screen.textContent).toContain('Opening Night')
    expect(screen.textContent).toContain('Finish the tutorial and serve 3 orders')
    expect(screen.textContent).not.toMatch(/[\u3400-\u9fff]/)
    act(() => root.unmount())
  })

  it('syncs English document metadata and language', () => {
    const meta = ensureDescriptionMeta()
    const { root } = renderEnglish('/?lang=en')

    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Night Market: Street Food Stall')
    expect(meta.content).toBe('Run a sizzling street food stall, serve hungry customers, and grow your night market business.')
    act(() => root.unmount())
  })

  it('keeps the existing Chinese document metadata', () => {
    const meta = ensureDescriptionMeta()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => root.render(<I18nProvider locale="zh-CN"><App /></I18nProvider>))

    expect(document.documentElement.lang).toBe('zh-CN')
    expect(document.title).toBe('夜市大排档')
    expect(meta.content).toBe('夜市大排档——一款温暖有烟火气的烤冷面点击经营小游戏。')
    act(() => root.unmount())
  })

  it('renders the summary, retention hook, and upgrades in English', () => {
    const { container, root } = renderEnglish('/?lang=en&qaScreen=summary&playDay=1')
    const screen = container.querySelector('.summary-screen')!
    expect(screen.textContent).toContain('Shift Complete')
    expect(screen.textContent).toContain('Opening Night')
    expect(screen.textContent).toContain('Next')
    expect(screen.textContent).toContain('Upgrade Heat')
    expect(screen.textContent).not.toMatch(/[\u3400-\u9fff]/)
    act(() => root.unmount())
  })
})
