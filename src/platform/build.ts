import type { PlatformId } from './types'

export const IS_POKI_BUILD = __POKI_BUILD__
export const PLATFORM_ID: PlatformId = IS_POKI_BUILD ? 'poki' : 'standalone'
