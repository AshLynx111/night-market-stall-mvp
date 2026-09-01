import { safeHttpUrl, type AnalyticsContext } from './context'
import type { TrackedGameEvent } from './events'
import { IS_POKI_BUILD } from '../platform/build'

export type AnalyticsSink = (event: TrackedGameEvent, lifecycle: boolean) => void | Promise<void>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function createDefaultAnalyticsSinks(context: AnalyticsContext): AnalyticsSink[] {
  if (IS_POKI_BUILD) return []
  const sinks: AnalyticsSink[] = []
  if ((import.meta.env.DEV && import.meta.env.MODE !== 'test') || context.playtestMode) {
    sinks.push((event) => console.info('[playtest]', event.name, event))
  }

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  sinks.push((event) => {
    if (typeof window.gtag !== 'function') return
    window.gtag('event', event.name, {
      ...event.properties,
      session_id: event.session_id,
      day_run_id: event.day_run_id,
      participant_id: event.participant_id,
      locale: event.locale,
      playtest_mode: event.playtest_mode,
      build_version: event.build_version,
      ...(measurementId ? { send_to: measurementId } : {}),
    })
  })

  const endpoint = safeHttpUrl(import.meta.env.VITE_PLAYTEST_ANALYTICS_ENDPOINT)
  if (endpoint) {
    sinks.push((event, lifecycle) => {
      const body = JSON.stringify(event)
      if (lifecycle && typeof navigator.sendBeacon === 'function') {
        try {
          if (navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))) return
        } catch {
          // Fall through to keepalive fetch.
        }
      }
      void fetch(endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'content-type': 'application/json' },
        body,
      }).catch(() => undefined)
    })
  }
  return sinks
}
