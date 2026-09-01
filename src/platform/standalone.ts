import type { GamePlatform } from './types'

export const standalonePlatform: GamePlatform = {
  id: 'standalone',
  async initialize() {},
  loadingFinished() {},
  gameplayStart() {},
  gameplayStop() {},
  async commercialBreak() {},
  async rewardedBreak() { return false },
}
