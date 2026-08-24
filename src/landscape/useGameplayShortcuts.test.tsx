import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGameplayShortcuts } from './useGameplayShortcuts'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => document.body.replaceChildren())

describe('useGameplayShortcuts', () => {
  it('routes Escape, H, and M only while live gameplay owns the keyboard', () => {
    const handlers = { onPause: vi.fn(), onHelp: vi.fn(), onMusic: vi.fn() }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    function Harness({ dialogOpen = false }: { dialogOpen?: boolean }) {
      useGameplayShortcuts({ enabled: true, dialogOpen, ...handlers })
      return <input aria-label="聊天输入" />
    }
    act(() => root.render(<Harness />))

    for (const key of ['Escape', 'h', 'M']) act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key })))
    expect(handlers.onPause).toHaveBeenCalledOnce()
    expect(handlers.onHelp).toHaveBeenCalledOnce()
    expect(handlers.onMusic).toHaveBeenCalledOnce()

    const input = host.querySelector('input')!
    input.focus()
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true })))
    expect(handlers.onMusic).toHaveBeenCalledOnce()

    act(() => root.render(<Harness dialogOpen />))
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(handlers.onPause).toHaveBeenCalledOnce()

    act(() => root.unmount())
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })))
    expect(handlers.onHelp).toHaveBeenCalledOnce()
  })
})
