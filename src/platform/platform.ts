import { standalonePlatform } from './standalone'
import type { GamePlatform } from './types'

let platformPromise: Promise<GamePlatform> | null = null

export function getConfiguredPlatform() {
  platformPromise ??= __POKI_BUILD__
    ? import('./poki').then(({ createPokiPlatform }) => createPokiPlatform())
    : Promise.resolve(standalonePlatform)
  return platformPromise
}

export async function initializeConfiguredPlatform() {
  const platform = await getConfiguredPlatform()
  await platform.initialize()
  return platform
}

export function resetConfiguredPlatformForTests() {
  platformPromise = null
}
