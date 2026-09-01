import { describe, expect, it, vi } from 'vitest'
import { schedulePlatformLoadingFinished } from './loading'

describe('platform loading readiness', () => {
  it('notifies once after the page and two paint frames', async () => {
    const callback = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => { next(0); return 1 })
    Object.defineProperty(document, 'readyState', { configurable: true, value: 'complete' })
    schedulePlatformLoadingFinished(callback)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
