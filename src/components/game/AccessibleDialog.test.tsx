import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessibleDialog } from './AccessibleDialog'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => document.body.replaceChildren())

describe('AccessibleDialog', () => {
  it('focuses the first control, traps Tab in both directions, and handles Escape', () => {
    const onClose = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    act(() => root.render(
      <AccessibleDialog label="测试弹窗" className="test-dialog" onClose={onClose}>
        <button>第一个</button>
        <button>最后一个</button>
      </AccessibleDialog>,
    ))

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button')]
    expect(document.activeElement).toBe(buttons[0])

    act(() => {
      buttons[1].focus()
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(document.activeElement).toBe(buttons[0])

    act(() => {
      buttons[0].focus()
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })
    expect(document.activeElement).toBe(buttons[1])

    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(onClose).toHaveBeenCalledOnce()
    act(() => root.unmount())
  })

  it('restores the connected trigger and falls back to the dialog when it has no controls', () => {
    const trigger = document.createElement('button')
    const host = document.createElement('div')
    document.body.append(trigger, host)
    trigger.focus()
    const root = createRoot(host)
    act(() => root.render(
      <AccessibleDialog label="空弹窗" className="empty-dialog" onClose={vi.fn()}>
        <p>暂无操作</p>
      </AccessibleDialog>,
    ))
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"]'))
    act(() => root.unmount())
    expect(document.activeElement).toBe(trigger)
  })
})
