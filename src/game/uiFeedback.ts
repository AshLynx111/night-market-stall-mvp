import { playSound } from './audio'

export function createUiFeedback(enabled: boolean) {
  return {
    tap: () => playSound('tap', enabled),
    success: () => playSound('success', enabled),
    upgrade: (accepted: boolean) => playSound(accepted ? 'upgrade' : 'error', enabled),
  }
}
