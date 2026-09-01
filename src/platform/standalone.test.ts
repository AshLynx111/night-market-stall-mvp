import { describe, expect, it, vi } from 'vitest'
import { standalonePlatform } from './standalone'

describe('standalone platform', () => {
  it('is an immediate no-op for every lifecycle operation', async () => {
    await expect(standalonePlatform.initialize()).resolves.toBeUndefined()
    expect(() => standalonePlatform.loadingFinished()).not.toThrow()
    expect(() => standalonePlatform.gameplayStart()).not.toThrow()
    expect(() => standalonePlatform.gameplayStop()).not.toThrow()
    await expect(standalonePlatform.commercialBreak()).resolves.toBeUndefined()
    await expect(standalonePlatform.rewardedBreak?.()).resolves.toBe(false)
  })

  it('does not read a Poki global', async () => {
    const getter = vi.fn(() => { throw new Error('Poki should not be read') })
    Object.defineProperty(window, 'PokiSDK', { configurable: true, get: getter })
    await standalonePlatform.initialize()
    expect(getter).not.toHaveBeenCalled()
  })
})
