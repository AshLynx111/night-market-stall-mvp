import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlatformInputLock } from './PlatformInputLock'

describe('PlatformInputLock', () => {
  let container: HTMLDivElement | null = null
  afterEach(() => container?.remove())

  it('blocks pointer and keyboard events only while active', () => {
    container = document.createElement('div'); document.body.append(container)
    const root = createRoot(container)
    const behind = document.createElement('button'); document.body.append(behind)
    const click = vi.fn(); behind.addEventListener('click', click)
    act(() => root.render(<PlatformInputLock active />))
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    behind.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(click).not.toHaveBeenCalled()
    expect(container.querySelector('[data-platform-input-lock]')).not.toBeNull()
    act(() => root.render(<PlatformInputLock active={false} />))
    behind.click(); expect(click).toHaveBeenCalledTimes(1)
    act(() => root.unmount()); behind.remove()
  })
})
