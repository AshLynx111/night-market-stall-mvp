import { setKitchenPlatformAudioSuspended } from './audio'
import { setBgmPlatformAudioSuspended } from './bgm'

export function setGamePlatformAudioSuspended(suspended: boolean) {
  setBgmPlatformAudioSuspended(suspended)
  setKitchenPlatformAudioSuspended(suspended)
}
