export interface AudioSettings {
  master: number
  music: number
  effects: number
  musicMuted: boolean
}

export const AUDIO_SETTINGS_KEY = 'night-market-audio-settings-v1'

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = Object.freeze({
  master: 1,
  music: 0.65,
  effects: 1,
  musicMuted: false,
})

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>

export function clampAudioLevel(value: unknown, fallback = 1): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

function normalizeAudioSettings(value: unknown): AudioSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_AUDIO_SETTINGS }
  const candidate = value as Partial<AudioSettings>
  return {
    master: clampAudioLevel(candidate.master, DEFAULT_AUDIO_SETTINGS.master),
    music: clampAudioLevel(candidate.music, DEFAULT_AUDIO_SETTINGS.music),
    effects: clampAudioLevel(candidate.effects, DEFAULT_AUDIO_SETTINGS.effects),
    musicMuted: typeof candidate.musicMuted === 'boolean'
      ? candidate.musicMuted
      : DEFAULT_AUDIO_SETTINGS.musicMuted,
  }
}

export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return { ...DEFAULT_AUDIO_SETTINGS }
  try {
    return normalizeAudioSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

export function loadAudioSettings(storage: StorageReader = localStorage): AudioSettings {
  try {
    return parseAudioSettings(storage.getItem(AUDIO_SETTINGS_KEY))
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

export function saveAudioSettings(settings: AudioSettings, storage: StorageWriter = localStorage): AudioSettings {
  const normalized = normalizeAudioSettings(settings)
  try {
    storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(normalized))
  } catch {
    // The in-memory settings remain usable when browser storage is unavailable.
  }
  return normalized
}
