import { describe, expect, it, vi } from 'vitest'
import { createPlatformLifecycleController } from './lifecycle'
import type { GamePlatform } from './types'

function harness() {
  const log: string[] = []
  let resolveBreak!: () => void
  const platform: GamePlatform = {
    id: 'poki', initialize: async () => { log.push('init') },
    loadingFinished: () => log.push('loadingFinished'),
    gameplayStart: () => log.push('gameplayStart'), gameplayStop: () => log.push('gameplayStop'),
    commercialBreak: () => new Promise<void>((resolve) => { log.push('break:start'); resolveBreak = () => { log.push('break:end'); resolve() } }),
  }
  const audio = vi.fn()
  return { log, audio, platform, resolveBreak: () => resolveBreak(), controller: createPlatformLifecycleController({ initialize: async () => { await platform.initialize(); return platform }, setAudioSuspended: audio }) }
}

describe('platform lifecycle controller', () => {
  it('orders and deduplicates loading and gameplay edges', async () => {
    const { controller, log } = harness()
    controller.markLoadingFinished(); controller.markLoadingFinished()
    controller.setGameplayDesired(true, 'playing'); controller.setGameplayDesired(true, 'playing')
    await controller.whenIdle()
    expect(log).toEqual(['init', 'loadingFinished', 'gameplayStart'])
    controller.setGameplayDesired(false, 'paused'); controller.setGameplayDesired(false, 'paused')
    await controller.whenIdle()
    expect(log.at(-1)).toBe('gameplayStop')
  })

  it('serializes a break, suspends audio, and continues once', async () => {
    const { controller, log, audio, resolveBreak } = harness()
    controller.setGameplayDesired(true, 'playing'); await controller.whenIdle()
    controller.setGameplayDesired(false, 'paused'); await controller.whenIdle()
    const continuation = vi.fn()
    const pending = controller.runCommercialBreak(continuation)
    await Promise.resolve(); await Promise.resolve()
    expect(controller.getSnapshot().breakActive).toBe(true)
    expect(audio).toHaveBeenCalledWith(true)
    resolveBreak(); await pending
    expect(continuation).toHaveBeenCalledTimes(1)
    expect(audio).toHaveBeenLastCalledWith(false)
    expect(log).toContain('break:end')
  })
})
