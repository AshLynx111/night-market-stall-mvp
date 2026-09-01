import { StrictMode } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { I18nProvider } from '../i18n/I18nProvider'
import {
  configureAnalyticsSinksForTests,
  initializeAnalytics,
  readAnalyticsEvents,
  resetAnalyticsForTests,
} from './tracker'

let root: Root | null = null

function renderPath(path: string) {
  window.history.replaceState({}, '', path)
  resetAnalyticsForTests()
  configureAnalyticsSinksForTests([])
  initializeAnalytics()
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root?.render(
    <StrictMode>
      <I18nProvider locale="en"><App /></I18nProvider>
    </StrictMode>,
  ))
  return container
}

function names() {
  return readAnalyticsEvents().map(({ name }) => name)
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  localStorage.clear()
  sessionStorage.clear()
  resetAnalyticsForTests()
  vi.restoreAllMocks()
})

describe('playtest funnel integration', () => {
  it('tracks load, Home, Start, and Day 1 once under StrictMode', () => {
    const container = renderPath('/?lang=en&playtest=1&pid=p07')
    expect(names()).toEqual(expect.arrayContaining(['game_loaded', 'session_started', 'home_viewed']))
    expect(names().filter((name) => name === 'home_viewed')).toHaveLength(1)

    act(() => container.querySelector<HTMLButtonElement>('.home-hotspot--start')!.click())

    expect(names()).toEqual(expect.arrayContaining([
      'start_game_clicked', 'day_started', 'tutorial_started', 'tutorial_step_viewed',
    ]))
    expect(names().filter((name) => name === 'day_started')).toHaveLength(1)
    const dayStarted = readAnalyticsEvents().find(({ name }) => name === 'day_started')
    expect(dayStarted?.day_run_id).toMatch(/^day-1-/)
    expect(dayStarted?.participant_id).toBe('p07')
  })

  it('distinguishes Settings and Day Select entry clicks', () => {
    let container = renderPath('/?lang=en&playtest=1')
    act(() => container.querySelector<HTMLButtonElement>('.home-hotspot--settings')!.click())
    expect(readAnalyticsEvents().find(({ name }) => name === 'settings_opened')?.properties)
      .toEqual({ source: 'home' })

    act(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    sessionStorage.clear()
    container = renderPath('/?lang=en&playtest=1')
    act(() => container.querySelector<HTMLButtonElement>('.home-hotspot--achievements')!.click())
    expect(readAnalyticsEvents().find(({ name }) => name === 'day_select_opened')?.properties)
      .toEqual({ source: 'home' })
  })

  it('deduplicates Summary views under StrictMode', () => {
    renderPath('/?lang=en&playtest=1&qaScreen=summary&playDay=1')
    expect(names().filter((name) => name === 'summary_viewed')).toHaveLength(1)
    expect(readAnalyticsEvents().find(({ name }) => name === 'summary_viewed')?.properties)
      .toEqual(expect.objectContaining({ day: 1, orders_served: 3 }))
  })
})
