import { useEffect } from 'react'

const BLOCKED_EVENTS = ['keydown', 'keyup', 'pointerdown', 'pointerup', 'click', 'touchstart', 'touchend'] as const

export function PlatformInputLock({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return
    const block = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    BLOCKED_EVENTS.forEach((name) => document.addEventListener(name, block, { capture: true, passive: false }))
    return () => BLOCKED_EVENTS.forEach((name) => document.removeEventListener(name, block, { capture: true }))
  }, [active])
  return active ? <div className="platform-input-lock" data-platform-input-lock aria-hidden="true" /> : null
}
