import { setGamePlatformAudioSuspended } from '../game/platformAudio'
import { initializeConfiguredPlatform } from './platform'
import type { GamePlatform } from './types'
import { IS_POKI_BUILD } from './build'

export type PlatformLifecyclePhase = 'loading' | 'menu' | 'playing' | 'paused' | 'event' | 'summary' | 'ad'
export interface PlatformSnapshot { breakActive: boolean; phase: PlatformLifecyclePhase }

interface ControllerOptions {
  initialize?: () => Promise<GamePlatform>
  setAudioSuspended?: (suspended: boolean) => void
}

export function createPlatformLifecycleController(options: ControllerOptions = {}) {
  const initialize = options.initialize ?? initializeConfiguredPlatform
  const setAudioSuspended = options.setAudioSuspended ?? (() => undefined)
  let platform: GamePlatform | null = null
  let initialization: Promise<void> | null = null
  let queue = Promise.resolve()
  let loadingDesired = false
  let loadingSent = false
  let gameplayDesired = false
  let gameplaySent = false
  let breakPromise: Promise<void> | null = null
  let snapshot: PlatformSnapshot = { breakActive: false, phase: 'loading' }
  const subscribers = new Set<() => void>()

  const notify = () => subscribers.forEach((listener) => listener())
  const setSnapshot = (next: PlatformSnapshot) => {
    if (next.breakActive === snapshot.breakActive && next.phase === snapshot.phase) return
    snapshot = next
    notify()
  }
  const enqueue = (task: () => void | Promise<void>) => {
    queue = queue.then(task, task).catch(() => undefined)
    return queue
  }
  const flush = () => enqueue(async () => {
    await startInitialization()
    if (!platform) return
    if (loadingDesired && !loadingSent) {
      platform.loadingFinished()
      loadingSent = true
    }
    if (snapshot.breakActive) return
    if (gameplayDesired === gameplaySent) return
    gameplayDesired ? platform.gameplayStart() : platform.gameplayStop()
    gameplaySent = gameplayDesired
  })
  const startInitialization = () => {
    initialization ??= initialize().then((value) => { platform = value }).catch(() => undefined)
    return initialization
  }

  return {
    initialize: async () => { await startInitialization(); await flush() },
    markLoadingFinished: () => { loadingDesired = true; void flush() },
    setGameplayDesired(active: boolean, phase: PlatformLifecyclePhase) {
      gameplayDesired = active
      if (!snapshot.breakActive) setSnapshot({ breakActive: false, phase })
      void flush()
    },
    runCommercialBreak(continueAction: () => void | Promise<void>) {
      if (breakPromise) return breakPromise
      gameplayDesired = false
      setSnapshot({ breakActive: true, phase: 'ad' })
      setAudioSuspended(true)
      breakPromise = enqueue(async () => {
        await startInitialization()
        if (platform && gameplaySent) {
          platform.gameplayStop()
          gameplaySent = false
        }
        try { await platform?.commercialBreak() } catch { /* Fail open. */ }
        try { await continueAction() } catch { /* Platform flow must always unlock. */ }
      }).finally(() => {
        setAudioSuspended(false)
        setSnapshot({ breakActive: false, phase: gameplayDesired ? 'playing' : 'menu' })
        breakPromise = null
        void flush()
      })
      return breakPromise
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { subscribers.add(listener); return () => subscribers.delete(listener) },
    whenIdle: async () => { await queue },
  }
}

export const platformLifecycle = createPlatformLifecycleController({
  setAudioSuspended: setGamePlatformAudioSuspended,
})

export const setPlatformGameplayDesired = platformLifecycle.setGameplayDesired
export function runPlatformCommercialBreak(continueAction: () => void | Promise<void>) {
  if (IS_POKI_BUILD) return platformLifecycle.runCommercialBreak(continueAction)
  try { return Promise.resolve(continueAction()).then(() => undefined, () => undefined) }
  catch { return Promise.resolve() }
}
