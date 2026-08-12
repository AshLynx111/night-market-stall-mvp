import { afterEach, describe, expect, it } from 'vitest'
import {
  AUDIO_SETTINGS_KEY,
  DEFAULT_AUDIO_SETTINGS,
  clampAudioLevel,
  loadAudioSettings,
  parseAudioSettings,
  saveAudioSettings,
} from './audioSettings'

afterEach(() => localStorage.clear())

describe('audio settings persistence', () => {
  it('clamps finite volume levels into the inclusive 0..1 range', () => {
    expect(clampAudioLevel(-0.2)).toBe(0)
    expect(clampAudioLevel(0.45)).toBe(0.45)
    expect(clampAudioLevel(1.4)).toBe(1)
    expect(clampAudioLevel(Number.NaN, 0.6)).toBe(0.6)
  })

  it('falls back safely for missing, malformed, and invalid stored values', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS)
    expect(parseAudioSettings('{not json')).toEqual(DEFAULT_AUDIO_SETTINGS)
    expect(parseAudioSettings(JSON.stringify({ master: 'loud', music: -1, effects: 4, musicMuted: 'yes' })))
      .toEqual({
        master: DEFAULT_AUDIO_SETTINGS.master,
        music: 0,
        effects: 1,
        musicMuted: DEFAULT_AUDIO_SETTINGS.musicMuted,
      })
  })

  it('normalizes values when saving and restores the saved settings', () => {
    const saved = saveAudioSettings({ master: 2, music: 0.35, effects: -3, musicMuted: true })

    expect(saved).toEqual({ master: 1, music: 0.35, effects: 0, musicMuted: true })
    expect(JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY)!)).toEqual(saved)
    expect(loadAudioSettings()).toEqual(saved)
  })
})
