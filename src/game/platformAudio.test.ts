import { describe, expect, it, vi } from 'vitest'

vi.mock('./audio', () => ({ setKitchenPlatformAudioSuspended: vi.fn() }))
vi.mock('./bgm', () => ({ setBgmPlatformAudioSuspended: vi.fn() }))

import { setKitchenPlatformAudioSuspended } from './audio'
import { setBgmPlatformAudioSuspended } from './bgm'
import { setGamePlatformAudioSuspended } from './platformAudio'

describe('platform audio suspension', () => {
  it('applies the temporary flag to both audio systems', () => {
    setGamePlatformAudioSuspended(true)
    expect(setKitchenPlatformAudioSuspended).toHaveBeenCalledWith(true)
    expect(setBgmPlatformAudioSuspended).toHaveBeenCalledWith(true)
  })
})
