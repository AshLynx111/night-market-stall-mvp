import { LOCALE_STORAGE_KEY, resolveInitialLocale, type Locale } from '../i18n/core'
import type { CoarsePlatform } from './events'

export const ANALYTICS_SESSION_KEY = 'night-market-playtest-session-v1'
export const ANALYTICS_BUFFER_KEY = 'night-market-playtest-events-v1'
export const MAX_BUFFERED_EVENTS = 1_000
export const DEFAULT_BUILD_VERSION = '0.1.0'

interface StoredAnalyticsSession {
  id: string
  startedAt: number
  startedSent: boolean
  onceKeys: string[]
}

export interface AnalyticsContext {
  sessionId: string
  startedAt: number
  startedSent: boolean
  onceKeys: Set<string>
  dayRunId?: string
  participantId?: string
  locale: Locale
  playtestMode: boolean
  debugMode: boolean
  buildVersion: string
}

let fallbackSequence = 0

export function anonymousId(prefix: string) {
  try {
    if (typeof crypto?.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`
    const values = new Uint32Array(4)
    crypto.getRandomValues(values)
    return `${prefix}-${[...values].map((value) => value.toString(16)).join('')}`
  } catch {
    fallbackSequence += 1
    return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}`
  }
}

export function sanitizeParticipantId(value: string | null) {
  const trimmed = value?.trim()
  return trimmed && /^[A-Za-z0-9_-]{1,32}$/.test(trimmed) ? trimmed : undefined
}

export function safeHttpUrl(value: string | undefined) {
  if (!value?.trim()) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

function sessionStorageOrNull() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function loadStoredSession(): StoredAnalyticsSession | null {
  try {
    const raw = sessionStorageOrNull()?.getItem(ANALYTICS_SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredAnalyticsSession>
    if (typeof value.id !== 'string' || !Number.isFinite(value.startedAt)) return null
    return {
      id: value.id,
      startedAt: Number(value.startedAt),
      startedSent: value.startedSent === true,
      onceKeys: Array.isArray(value.onceKeys) ? value.onceKeys.filter((key): key is string => typeof key === 'string') : [],
    }
  } catch {
    return null
  }
}

export function persistAnalyticsContext(context: AnalyticsContext) {
  try {
    sessionStorageOrNull()?.setItem(ANALYTICS_SESSION_KEY, JSON.stringify({
      id: context.sessionId,
      startedAt: context.startedAt,
      startedSent: context.startedSent,
      onceKeys: [...context.onceKeys].slice(-500),
    } satisfies StoredAnalyticsSession))
  } catch {
    // Analytics storage is optional.
  }
}

export function createAnalyticsContext(search = window.location.search): AnalyticsContext {
  const query = new URLSearchParams(search)
  const playtestMode = query.get('playtest') === '1'
  const stored = loadStoredSession()
  let storedLocale: string | null = null
  try {
    storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    // Locale storage can be denied.
  }
  return {
    sessionId: stored?.id ?? anonymousId('session'),
    startedAt: stored?.startedAt ?? Date.now(),
    startedSent: stored?.startedSent ?? false,
    onceKeys: new Set(stored?.onceKeys ?? []),
    participantId: playtestMode ? sanitizeParticipantId(query.get('pid')) : undefined,
    locale: resolveInitialLocale(search, storedLocale),
    playtestMode,
    debugMode: playtestMode && query.get('debug') === '1',
    buildVersion: import.meta.env.VITE_BUILD_VERSION?.trim() || DEFAULT_BUILD_VERSION,
  }
}

export function coarsePlatform(): CoarsePlatform {
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  const shortSide = Math.min(window.innerWidth, window.innerHeight)
  if (!touch) return 'desktop'
  return shortSide >= 600 ? 'tablet' : 'mobile'
}

export function hasTouchCapability() {
  return navigator.maxTouchPoints > 0 || 'ontouchstart' in window
}
