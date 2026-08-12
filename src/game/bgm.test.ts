import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAudioSettings, stopBgm, unlockAndPlayBgm } from './bgm'
import type { AudioSettings } from './audioSettings'

describe('persistent background music', () => {
  const instances: MockAudio[] = []

  class MockAudio {
    loop = false
    preload = ''
    volume = 1
    muted = false
    currentTime = 0
    play = vi.fn().mockResolvedValue(undefined)
    pause = vi.fn()

    constructor(public src = '') {
      instances.push(this)
    }
  }

  const settings = (overrides: Partial<AudioSettings> = {}): AudioSettings => ({
    master: 0.8,
    music: 0.5,
    effects: 0.25,
    musicMuted: false,
    ...overrides,
  })

  beforeEach(() => {
    stopBgm()
    instances.length = 0
    vi.stubGlobal('Audio', MockAudio)
  })

  it('does not create or play audio until explicitly unlocked by a user gesture', () => {
    applyAudioSettings(settings())
    expect(instances).toHaveLength(0)
  })

  it('creates one looped element and keeps it across repeated screen interactions', async () => {
    await unlockAndPlayBgm(settings())
    expect(instances).toHaveLength(1)
    expect(instances[0].loop).toBe(true)
    expect(instances[0].volume).toBeCloseTo(0.4)
    expect(instances[0].play).toHaveBeenCalledTimes(1)

    instances[0].currentTime = 12.5
    await unlockAndPlayBgm(settings())
    expect(instances).toHaveLength(1)
    expect(instances[0].currentTime).toBe(12.5)
  })

  it('applies master times music volume and makes mute an actual zero-volume mix', async () => {
    await unlockAndPlayBgm(settings())
    applyAudioSettings(settings({ master: 0.6, music: 0.25 }))
    expect(instances[0].volume).toBeCloseTo(0.15)
    expect(instances[0].muted).toBe(false)

    applyAudioSettings(settings({ musicMuted: true }))
    expect(instances[0].volume).toBe(0)
    expect(instances[0].muted).toBe(true)
  })
})
