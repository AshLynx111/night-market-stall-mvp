import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  playBurnWarning,
  playCustomerReaction,
  playReadyCue,
  setAudioEffectLevel,
  setKitchenAudioEnabled,
  startSizzle,
  stopAllKitchenAudio,
  stopSizzle,
} from './audio'

describe('kitchen audio loops', () => {
  const started: Array<ReturnType<typeof vi.fn>> = []
  const stopped: Array<ReturnType<typeof vi.fn>> = []
  const gainValues: number[] = []
  const rampValues: number[] = []
  const liveMixValues: number[] = []

  beforeEach(() => {
    stopAllKitchenAudio()
    started.length = 0
    stopped.length = 0
    gainValues.length = 0
    rampValues.length = 0
    liveMixValues.length = 0
    class MockAudioContext {
      currentTime = 0
      destination = {}
      state = 'running'
      resume = vi.fn()
      createOscillator() {
        const start = vi.fn()
        const stop = vi.fn()
        started.push(start)
        stopped.push(stop)
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start,
          stop,
          onended: null,
        }
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn((value: number) => gainValues.push(value)),
            exponentialRampToValueAtTime: vi.fn((value: number) => rampValues.push(value)),
            cancelScheduledValues: vi.fn(),
            setTargetAtTime: vi.fn((value: number) => liveMixValues.push(value)),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        }
      }
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, value: MockAudioContext })
    setKitchenAudioEnabled(true)
    setAudioEffectLevel(1)
  })

  it('maintains one loop per slot and stops slots independently or together', () => {
    startSizzle('left')
    startSizzle('left')
    startSizzle('right')
    expect(started).toHaveLength(2)

    stopSizzle('left')
    expect(stopped[0]).toHaveBeenCalledTimes(1)
    expect(stopped[1]).not.toHaveBeenCalled()

    stopAllKitchenAudio()
    expect(stopped[1]).toHaveBeenCalledTimes(1)
  })

  it('stops active loops when kitchen sound is disabled', () => {
    startSizzle('left')
    startSizzle('right')
    playReadyCue('left')
    setKitchenAudioEnabled(false)

    expect(stopped).toHaveLength(4)
    expect(stopped.slice(0, 2).every((stop) => stop.mock.calls.length === 1)).toBe(true)
    expect(stopped.slice(2).every((stop) => stop.mock.calls.length === 2)).toBe(true)
  })

  it('cancels active and future-start ready, burn, and reaction cues', () => {
    playReadyCue('left')
    playBurnWarning('right')
    playCustomerReaction('happy')
    expect(started).toHaveLength(7)

    stopAllKitchenAudio()

    expect(stopped).toHaveLength(7)
    expect(stopped.every((stop) => stop.mock.calls.length === 2)).toBe(true)
  })

  it('multiplies every sound-effect gain by the configured effects mix', () => {
    setAudioEffectLevel(0.2)
    playReadyCue('left')
    expect(gainValues.some((value) => Math.abs(value - (0.028 * 0.2)) < 0.000001)).toBe(true)
    expect(rampValues.every((value) => value <= 0.001 * 0.2)).toBe(true)

    gainValues.length = 0
    startSizzle('right')
    expect(gainValues.some((value) => Math.abs(value - (0.008 * 0.2)) < 0.000001)).toBe(true)
  })

  it('ramps every already-playing sizzle loop when the effects mix changes', () => {
    startSizzle('left')
    startSizzle('right')

    setAudioEffectLevel(0.35)

    expect(liveMixValues).toEqual([0.008 * 0.35, 0.008 * 0.35])
  })
})
