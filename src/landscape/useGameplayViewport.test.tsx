import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fitGameplayScene, useGameplayViewport } from './useGameplayViewport'

function rect(width: number, height: number): DOMRect {
  return {
    x: 0, y: 0, left: 0, top: 0, width, height, right: width, bottom: height,
    toJSON: () => ({}),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('gameplay viewport fitting', () => {
  it('fits the logical scene by the limiting dimension and guards invalid measurements', () => {
    expect(fitGameplayScene(720, 810)).toBe(.5)
    expect(fitGameplayScene(1440, 405)).toBe(.5)
    expect(fitGameplayScene(0, 405)).toBe(1)
    expect(fitGameplayScene(1440, Number.NaN)).toBe(1)
  })

  it('tracks the safe viewport and cleans up every mobile viewport listener', () => {
    let measured = rect(720, 810)
    let notifyResize = () => {}
    const observe = vi.fn()
    const disconnect = vi.fn()
    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () => callback([], this as unknown as ResizeObserver)
      }
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
    }
    const visualListeners = new Map<string, EventListener>()
    const visualViewport = {
      addEventListener: vi.fn((type: string, listener: EventListener) => visualListeners.set(type, listener)),
      removeEventListener: vi.fn((type: string, listener: EventListener) => {
        if (visualListeners.get(type) === listener) visualListeners.delete(type)
      }),
    }
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    vi.stubGlobal('visualViewport', visualViewport)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => measured)

    function Harness() {
      const { viewportRef, sceneScale, sceneInverseScale } = useGameplayViewport()
      return <div ref={viewportRef} data-scale={sceneScale} data-inverse={sceneInverseScale} />
    }

    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(<Harness />))
    const viewport = container.firstElementChild as HTMLElement

    expect(viewport.dataset.scale).toBe('0.5')
    expect(viewport.dataset.inverse).toBe('2')
    expect(observe).toHaveBeenCalledWith(viewport)
    expect(visualViewport.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))

    measured = rect(1440, 810)
    act(() => notifyResize())
    expect(viewport.dataset.scale).toBe('1')

    measured = rect(1440, 405)
    act(() => visualListeners.get('resize')?.(new Event('resize')))
    expect(viewport.dataset.scale).toBe('0.5')

    act(() => root.unmount())
    expect(disconnect).toHaveBeenCalledOnce()
    expect(visualViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(visualListeners.size).toBe(0)
  })
})
