import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { I18nProvider } from '../../i18n/I18nProvider'
import {
  configureAnalyticsSinksForTests,
  initializeAnalytics,
  resetAnalyticsForTests,
  trackGameEvent,
} from '../../analytics/tracker'

let root: Root | null = null

async function renderPath(path: string) {
  window.history.replaceState({}, '', path)
  resetAnalyticsForTests()
  configureAnalyticsSinksForTests([])
  initializeAnalytics()
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => {
    root?.render(<I18nProvider locale="en"><App /></I18nProvider>)
  })
  await act(async () => {
    await vi.dynamicImportSettled()
  })
  return container
}

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
  localStorage.clear()
  resetAnalyticsForTests()
  vi.restoreAllMocks()
})

describe('playtest debug panel', () => {
  it('is absent from normal and debug-only URLs', async () => {
    let container = await renderPath('/?lang=en')
    expect(container.querySelector('[data-playtest-debug]')).toBeNull()

    act(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    sessionStorage.clear()
    container = await renderPath('/?lang=en&debug=1')
    expect(container.querySelector('[data-playtest-debug]')).toBeNull()
  })

  it('appears only with both playtest and debug and exports a Blob', async () => {
    const createObjectURL = vi.fn(() => 'blob:playtest')
    const revokeObjectURL = vi.fn()
    class MockURL extends URL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
    vi.stubGlobal('URL', MockURL)
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const container = await renderPath('/?lang=en&playtest=1&debug=1&pid=p07')
    act(() => { trackGameEvent('home_viewed', {}) })

    const panel = container.querySelector('[data-playtest-debug]')
    expect(panel).not.toBeNull()
    expect(panel?.textContent).toContain('p07')
    act(() => [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === 'Export Events')!.click())
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledTimes(1)
  })
})
