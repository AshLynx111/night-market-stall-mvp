import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_SESSION_KEY } from './context'
import {
  configureAnalyticsSinksForTests,
  initializeAnalytics,
  readAnalyticsEvents,
  resetAnalyticsForTests,
  trackGameEvent,
} from './tracker'

describe('analytics tracker', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?lang=en&playtest=1&pid=p07')
    sessionStorage.clear()
    localStorage.clear()
    resetAnalyticsForTests()
    configureAnalyticsSinksForTests([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
    sessionStorage.clear()
    localStorage.clear()
    resetAnalyticsForTests()
  })

  it('normalizes valid events and rejects invalid payloads safely', () => {
    initializeAnalytics()
    const event = trackGameEvent('day_started', { day: 1, guided_tutorial: true })
    expect(event?.properties).toEqual({ day: 1, guided_tutorial: true })
    expect(event?.participant_id).toBe('p07')
    expect(() => trackGameEvent('day_started', null as never)).not.toThrow()
    expect(trackGameEvent('day_started', null as never)).toBeNull()
  })

  it('deduplicates once-key events', () => {
    initializeAnalytics()
    trackGameEvent('tutorial_completed', { elapsed_since_tutorial_start_ms: 5_000 }, { onceKey: 'tutorial:1' })
    trackGameEvent('tutorial_completed', { elapsed_since_tutorial_start_ms: 5_000 }, { onceKey: 'tutorial:1' })
    expect(readAnalyticsEvents().filter(({ name }) => name === 'tutorial_completed')).toHaveLength(1)
  })

  it('isolates synchronous and asynchronous sink failures', async () => {
    configureAnalyticsSinksForTests([
      () => { throw new Error('offline') },
      async () => { throw new Error('rejected') },
    ])
    initializeAnalytics()
    expect(() => trackGameEvent('home_viewed', {})).not.toThrow()
    await Promise.resolve()
    expect(readAnalyticsEvents().some(({ name }) => name === 'home_viewed')).toBe(true)
  })

  it('restores the anonymous session across reload initialization', () => {
    const first = initializeAnalytics().sessionId
    const stored = sessionStorage.getItem(ANALYTICS_SESSION_KEY)
    expect(stored).toContain(first)
    resetAnalyticsForTests()
    configureAnalyticsSinksForTests([])
    const second = initializeAnalytics().sessionId
    expect(second).toBe(first)
    expect(readAnalyticsEvents().filter(({ name }) => name === 'session_started')).toHaveLength(1)
  })

  it('omits participant codes outside playtest mode or when invalid', () => {
    window.history.replaceState({}, '', '/?lang=en&pid=real-person')
    initializeAnalytics()
    expect(trackGameEvent('home_viewed', {})?.participant_id).toBeUndefined()

    sessionStorage.clear()
    resetAnalyticsForTests()
    configureAnalyticsSinksForTests([])
    window.history.replaceState({}, '', `/?playtest=1&pid=${'x'.repeat(33)}`)
    initializeAnalytics()
    expect(trackGameEvent('home_viewed', {})?.participant_id).toBeUndefined()
  })
})
