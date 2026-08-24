import { useEffect } from 'react'

function ownsTextInput(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || Boolean(target.closest('input, select, textarea, [contenteditable="true"], [role="dialog"]'))
}

export function useGameplayShortcuts({ enabled, dialogOpen, onPause, onHelp, onMusic }: {
  enabled: boolean
  dialogOpen: boolean
  onPause: () => void
  onHelp: () => void
  onMusic: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || dialogOpen || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || ownsTextInput(event.target)) return
      const key = event.key.toLowerCase()
      const action = event.key === 'Escape' ? onPause : key === 'h' ? onHelp : key === 'm' ? onMusic : null
      if (!action) return
      event.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialogOpen, enabled, onHelp, onMusic, onPause])
}
