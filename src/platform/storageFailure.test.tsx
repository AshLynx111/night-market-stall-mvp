import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { I18nProvider } from '../i18n/I18nProvider'

describe('storage failure', () => {
  const localDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  const sessionDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
  afterEach(() => {
    if (localDescriptor) Object.defineProperty(window, 'localStorage', localDescriptor)
    if (sessionDescriptor) Object.defineProperty(window, 'sessionStorage', sessionDescriptor)
  })

  it('keeps Home and Day 1 playable when browser storage is denied', () => {
    const denied = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() {}, clear() {}, key() { return null }, length: 0 }
    Object.defineProperty(window, 'localStorage', { configurable: true, value: denied })
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: denied })
    const container = document.createElement('div'); document.body.append(container)
    const root = createRoot(container)
    act(() => root.render(<I18nProvider><App /></I18nProvider>))
    const start = container.querySelector<HTMLButtonElement>('[aria-label="开始游戏"]')
    expect(start).not.toBeNull()
    act(() => start?.click())
    expect(container.querySelector('[data-screen-art="kitchen"]')).not.toBeNull()
    act(() => root.unmount()); container.remove()
  })
})
