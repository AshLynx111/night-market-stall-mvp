import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider'
import { configureAnalyticsSinksForTests, readAnalyticsEvents, resetAnalyticsForTests } from '../../analytics/tracker'
import { PlaytestFeedbackLink } from './PlaytestFeedbackLink'

let root: Root | null = null

function render(path: string, feedbackUrl: string) {
  window.history.replaceState({}, '', path)
  vi.stubEnv('VITE_PLAYTEST_FEEDBACK_URL', feedbackUrl)
  resetAnalyticsForTests()
  configureAnalyticsSinksForTests([])
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  act(() => root?.render(<I18nProvider locale="en"><PlaytestFeedbackLink day={1} /></I18nProvider>))
  return container
}

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = null
  document.body.replaceChildren()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
  localStorage.clear()
  resetAnalyticsForTests()
  vi.unstubAllEnvs()
})

describe('playtest feedback hook', () => {
  it('stays absent without configuration and outside playtest mode', () => {
    let container = render('/?playtest=1', '')
    expect(container.querySelector('.playtest-feedback-link')).toBeNull()

    act(() => root?.unmount())
    root = null
    document.body.replaceChildren()
    sessionStorage.clear()
    container = render('/', 'https://example.test/form')
    expect(container.querySelector('.playtest-feedback-link')).toBeNull()
  })

  it('renders a safe secondary link and records feedback_clicked', () => {
    const container = render('/?lang=en&playtest=1', 'https://example.test/form')
    const link = container.querySelector<HTMLAnchorElement>('.playtest-feedback-link')!
    expect(link.textContent).toBe('Give Feedback')
    expect(link.href).toBe('https://example.test/form')
    expect(link.rel).toBe('noopener noreferrer')
    act(() => link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })))
    expect(readAnalyticsEvents().find(({ name }) => name === 'feedback_clicked')?.properties).toEqual({ day: 1 })
  })
})
