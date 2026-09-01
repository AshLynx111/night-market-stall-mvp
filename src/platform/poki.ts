import type { GamePlatform, PokiSdk } from './types'

declare global {
  interface Window { PokiSDK?: PokiSdk }
}

export interface PokiPlatformOptions {
  resolveSdk?: () => PokiSdk | undefined
  timeoutMs?: number
  pollMs?: number
  warn?: (message: string, error?: unknown) => void
}

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function createPokiPlatform(options: PokiPlatformOptions = {}): GamePlatform {
  const resolveSdk = options.resolveSdk ?? (() => window.PokiSDK)
  const timeoutMs = options.timeoutMs ?? 3_000
  const pollMs = options.pollMs ?? 25
  const warn = options.warn ?? ((message, error) => console.warn(message, error))
  let sdk: PokiSdk | null = null
  let initialization: Promise<void> | null = null

  const initialize = () => {
    initialization ??= (async () => {
      let expired = false
      const timeout = delay(timeoutMs).then(() => { expired = true })
      const findAndInitialize = (async () => {
        while (!expired) {
          const candidate = resolveSdk()
          if (candidate) {
            await candidate.init()
            if (!expired) sdk = candidate
            return
          }
          await delay(pollMs)
        }
      })()
      try {
        await Promise.race([findAndInitialize, timeout])
      } catch (error) {
        warn('Poki SDK initialization failed; continuing without ads.', error)
        sdk = null
      }
    })()
    return initialization
  }

  const safely = (name: string, callback: (active: PokiSdk) => void) => {
    try {
      if (sdk) callback(sdk)
    } catch (error) {
      warn(`Poki SDK ${name} failed.`, error)
    }
  }

  return {
    id: 'poki',
    initialize,
    loadingFinished: () => safely('gameLoadingFinished', (active) => active.gameLoadingFinished()),
    gameplayStart: () => safely('gameplayStart', (active) => active.gameplayStart()),
    gameplayStop: () => safely('gameplayStop', (active) => active.gameplayStop()),
    async commercialBreak() {
      try {
        if (sdk) await sdk.commercialBreak()
      } catch (error) {
        warn('Poki SDK commercialBreak failed; continuing gameplay.', error)
      }
    },
    async rewardedBreak() { return false },
  }
}
