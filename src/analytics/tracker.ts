import {
  ANALYTICS_BUFFER_KEY,
  MAX_BUFFERED_EVENTS,
  anonymousId,
  coarsePlatform,
  createAnalyticsContext,
  hasTouchCapability,
  persistAnalyticsContext,
  type AnalyticsContext,
} from './context'
import { isGameEventName, isValidGameEvent, type AnalyticsScreen, type GameEventName, type GameEventProperties, type TrackOptions, type TrackedGameEvent } from './events'
import { createDefaultAnalyticsSinks, type AnalyticsSink } from './sinks'
import type { Locale } from '../i18n/core'
import type { TutorialStep } from '../landscape/kitchen/tutorial'

export interface AnalyticsCheckpoint {
  screen: AnalyticsScreen
  day?: number
  tutorialStep?: TutorialStep
  ordersServed: number
}

export interface AnalyticsSnapshot extends AnalyticsCheckpoint {
  sessionId: string
  locale: Locale
  eventCount: number
  buildVersion: string
  playtestMode: boolean
  debugMode: boolean
}

let context: AnalyticsContext | null = null
let events: TrackedGameEvent[] = []
let sinks: AnalyticsSink[] = []
let listenersAttached = false
let customTestSinks: AnalyticsSink[] | null = null
let checkpoint: AnalyticsCheckpoint = { screen: 'home', ordersServed: 0 }
let subscribers = new Set<() => void>()
let lastCheckpointAt = 0
let documentId = anonymousId('document')

function storageOrNull() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function restoreBuffer() {
  if (!context?.playtestMode) return []
  try {
    const parsed = JSON.parse(storageOrNull()?.getItem(ANALYTICS_BUFFER_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((event) => event && typeof event === 'object').slice(-MAX_BUFFERED_EVENTS) as TrackedGameEvent[] : []
  } catch {
    return []
  }
}

function persistBuffer() {
  if (!context?.playtestMode) return
  try {
    storageOrNull()?.setItem(ANALYTICS_BUFFER_KEY, JSON.stringify(events.slice(-MAX_BUFFERED_EVENTS)))
  } catch {
    // Memory remains the fallback buffer.
  }
}

function notify() {
  subscribers.forEach((subscriber) => {
    try { subscriber() } catch { /* Debug subscribers cannot affect the game. */ }
  })
}

function dispatchToSinks(event: TrackedGameEvent, lifecycle: boolean) {
  for (const sink of sinks) {
    queueMicrotask(() => {
      try {
        void Promise.resolve(sink(event, lifecycle)).catch(() => undefined)
      } catch {
        // Each sink fails independently.
      }
    })
  }
}

function lifecyclePayload<Reason extends 'hidden' | 'pagehide'>(reason: Reason) {
  const active = requireContext()
  return {
    screen: checkpoint.screen,
    day: checkpoint.day,
    tutorial_step: checkpoint.tutorialStep,
    orders_served: checkpoint.ordersServed,
    elapsed_ms: Math.max(0, Date.now() - active.startedAt),
    reason,
  }
}

function emitCheckpoint(reason: 'hidden' | 'pagehide') {
  const now = Date.now()
  if (now - lastCheckpointAt < 250) return
  lastCheckpointAt = now
  trackGameEvent('session_checkpoint', lifecyclePayload(reason), { lifecycle: true })
}

function attachLifecycleListeners() {
  if (listenersAttached) return
  listenersAttached = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') emitCheckpoint('hidden')
  })
  window.addEventListener('pagehide', (event) => {
    emitCheckpoint('pagehide')
    if (!event.persisted) {
      trackGameEvent('session_ended', lifecyclePayload('pagehide'), {
        lifecycle: true,
        onceKey: `session-ended:${documentId}`,
      })
    }
  })
}

function requireContext() {
  if (!context) initializeAnalytics()
  return context as AnalyticsContext
}

export function initializeAnalytics() {
  if (context) return context
  context = createAnalyticsContext()
  events = restoreBuffer()
  sinks = customTestSinks ?? createDefaultAnalyticsSinks(context)
  attachLifecycleListeners()
  const initialScreen: AnalyticsScreen = 'home'
  trackGameEvent('game_loaded', { screen: initialScreen }, { onceKey: `game-loaded:${documentId}` })
  if (!context.startedSent) {
    trackGameEvent('session_started', { screen: initialScreen }, { onceKey: 'session-started' })
    context.startedSent = true
    persistAnalyticsContext(context)
  }
  return context
}

export function getPlaytestConfig() {
  const active = requireContext()
  return {
    playtestMode: active.playtestMode,
    debugMode: active.debugMode,
    participantId: active.participantId,
    buildVersion: active.buildVersion,
  }
}

export function setAnalyticsLocale(locale: Locale) {
  const active = requireContext()
  active.locale = locale
  notify()
}

export function beginAnalyticsDayRun(day: number) {
  const active = requireContext()
  active.dayRunId = anonymousId(`day-${day}`)
  checkpoint = { screen: 'playing', day, ordersServed: 0 }
  notify()
  return active.dayRunId
}

export function setAnalyticsCheckpoint(next: Partial<AnalyticsCheckpoint>) {
  const updated = { ...checkpoint, ...next }
  if (updated.screen === checkpoint.screen
    && updated.day === checkpoint.day
    && updated.tutorialStep === checkpoint.tutorialStep
    && updated.ordersServed === checkpoint.ordersServed) return
  checkpoint = updated
  notify()
}

export function analyticsSessionElapsedMs() {
  return Math.max(0, Date.now() - requireContext().startedAt)
}

export function trackGameEvent<Name extends GameEventName>(name: Name, properties: GameEventProperties[Name], options: TrackOptions = {}): TrackedGameEvent<Name> | null {
  try {
    if (!isGameEventName(name) || !isValidGameEvent(name, properties)) return null
    const active = requireContext()
    if (options.onceKey && active.onceKeys.has(options.onceKey)) return null
    if (options.onceKey) {
      active.onceKeys.add(options.onceKey)
      persistAnalyticsContext(active)
    }
    const event: TrackedGameEvent<Name> = {
      event_id: anonymousId('event'),
      name,
      timestamp: new Date().toISOString(),
      t: Math.max(0, Date.now() - active.startedAt),
      session_id: active.sessionId,
      ...(active.dayRunId ? { day_run_id: active.dayRunId } : {}),
      ...(active.participantId ? { participant_id: active.participantId } : {}),
      locale: active.locale,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      touch: hasTouchCapability(),
      platform: coarsePlatform(),
      playtest_mode: active.playtestMode,
      build_version: active.buildVersion,
      properties,
    }
    events = [...events, event].slice(-MAX_BUFFERED_EVENTS)
    persistBuffer()
    dispatchToSinks(event, options.lifecycle === true)
    notify()
    return event
  } catch {
    return null
  }
}

export function readAnalyticsEvents() {
  return [...events]
}

export function getAnalyticsSnapshot(): AnalyticsSnapshot {
  const active = requireContext()
  return {
    ...checkpoint,
    sessionId: active.sessionId,
    locale: active.locale,
    eventCount: events.length,
    buildVersion: active.buildVersion,
    playtestMode: active.playtestMode,
    debugMode: active.debugMode,
  }
}

export function subscribeAnalytics(subscriber: () => void) {
  subscribers.add(subscriber)
  return () => subscribers.delete(subscriber)
}

export function exportAnalyticsSession() {
  const active = requireContext()
  return {
    session: {
      session_id: active.sessionId,
      participant_id: active.participantId,
      started_at: new Date(active.startedAt).toISOString(),
      build_version: active.buildVersion,
      locale: active.locale,
      playtest_mode: active.playtestMode,
    },
    events: readAnalyticsEvents(),
  }
}

export function configureAnalyticsSinksForTests(next: AnalyticsSink[]) {
  customTestSinks = next
  sinks = next
}

export function resetAnalyticsForTests() {
  context = null
  events = []
  sinks = []
  customTestSinks = []
  checkpoint = { screen: 'home', ordersServed: 0 }
  subscribers = new Set()
  lastCheckpointAt = 0
  documentId = anonymousId('document')
}
