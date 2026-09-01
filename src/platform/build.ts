import type { PlatformId } from './types'

export const PLATFORM_ID: PlatformId = import.meta.env.VITE_PLATFORM === 'poki' ? 'poki' : 'standalone'
export const IS_POKI_BUILD = PLATFORM_ID === 'poki'
