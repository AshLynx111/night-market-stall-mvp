import soundtrackUrl from '../assets/audio/night-market-bgm.mp3'
import type { AudioSettings } from './audioSettings'

let bgm: HTMLAudioElement | null = null
let hasStarted = false

function musicVolume(settings: AudioSettings) {
  return settings.musicMuted ? 0 : settings.master * settings.music
}

function syncElement(settings: AudioSettings) {
  if (!bgm) return
  bgm.volume = musicVolume(settings)
  bgm.muted = settings.musicMuted
}

export function applyAudioSettings(settings: AudioSettings) {
  syncElement(settings)
}

export async function unlockAndPlayBgm(settings: AudioSettings) {
  applyAudioSettings(settings)
  if (!bgm) {
    bgm = new Audio(soundtrackUrl)
    bgm.loop = true
    bgm.preload = 'auto'
    if (bgm instanceof HTMLElement) {
      bgm.dataset.gameBgm = 'true'
      bgm.hidden = true
      document.body.append(bgm)
    }
    syncElement(settings)
  }
  if (hasStarted) return
  try {
    await bgm.play()
    hasStarted = true
  } catch {
    // Browsers can still decline a gesture in unusual embedded contexts.
    // A later trusted interaction retries this same persistent element.
  }
}

export function stopBgm() {
  if (bgm) bgm.pause()
  if (bgm instanceof HTMLElement) bgm.remove()
  bgm = null
  hasStarted = false
}
