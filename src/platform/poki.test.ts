import { describe, expect, it, vi } from 'vitest'
import { createPokiPlatform } from './poki'
import type { PokiSdk } from './types'

function mockSdk(overrides: Partial<PokiSdk> = {}): PokiSdk {
  return {
    init: vi.fn(async () => undefined),
    gameLoadingFinished: vi.fn(), gameplayStart: vi.fn(), gameplayStop: vi.fn(),
    commercialBreak: vi.fn(async () => undefined), ...overrides,
  }
}

describe('Poki platform adapter', () => {
  it('initializes once and delegates safe calls', async () => {
    const sdk = mockSdk()
    const platform = createPokiPlatform({ resolveSdk: () => sdk })
    await Promise.all([platform.initialize(), platform.initialize()])
    platform.loadingFinished(); platform.gameplayStart(); platform.gameplayStop()
    await platform.commercialBreak()
    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(sdk.gameLoadingFinished).toHaveBeenCalledTimes(1)
    expect(sdk.gameplayStart).toHaveBeenCalledTimes(1)
    expect(sdk.gameplayStop).toHaveBeenCalledTimes(1)
    expect(sdk.commercialBreak).toHaveBeenCalledTimes(1)
  })

  it('fails open when initialization or lifecycle calls fail', async () => {
    const sdk = mockSdk({ init: vi.fn(async () => { throw new Error('offline') }) })
    const platform = createPokiPlatform({ resolveSdk: () => sdk, timeoutMs: 10 })
    await expect(platform.initialize()).resolves.toBeUndefined()
    expect(() => platform.gameplayStart()).not.toThrow()
    await expect(platform.commercialBreak()).resolves.toBeUndefined()
  })

  it('fails open when a commercial break rejects', async () => {
    const sdk = mockSdk({ commercialBreak: vi.fn(async () => { throw new Error('no ad') }) })
    const platform = createPokiPlatform({ resolveSdk: () => sdk, warn: vi.fn() })
    await platform.initialize()
    await expect(platform.commercialBreak()).resolves.toBeUndefined()
  })

  it('fails open at the deadline when the SDK is missing', async () => {
    vi.useFakeTimers()
    const platform = createPokiPlatform({ resolveSdk: () => undefined, timeoutMs: 3_000, pollMs: 25 })
    const pending = platform.initialize()
    await vi.advanceTimersByTimeAsync(3_000)
    await expect(pending).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})
