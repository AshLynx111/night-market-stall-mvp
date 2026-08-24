import { useLayoutEffect, useRef, type ReactNode } from 'react'

const FOCUSABLE = [
  'button:not(:disabled)',
  '[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function AccessibleDialog({ label, className, onClose, children }: {
  label: string
  className: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const firstControl = dialog?.querySelector<HTMLElement>(FOCUSABLE)
    ;(firstControl ?? dialog)?.focus()
    return () => {
      const trigger = restoreFocusRef.current
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])

  return (
    <div className="modal-backdrop">
      <section
        className={className}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose()
            return
          }
          if (event.key !== 'Tab') return

          const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
          if (controls.length === 0) {
            event.preventDefault()
            dialogRef.current?.focus()
            return
          }
          const first = controls[0]
          const last = controls.at(-1)!
          if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
      >
        {children}
      </section>
    </div>
  )
}
