import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fitGameplayScene, useGameplayViewport } from './useGameplayViewport'

interface MutableBounds {
  width: number
  height: number
}

let bounds: MutableBounds
let resizeObserverCallback: ResizeObserverCallback | null
let visualViewportTarget: EventTarget
let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect
let originalResizeObserver: typeof ResizeObserver | undefined
let originalVisualViewportDescriptor: PropertyDescriptor | undefined
let observeMock: ReturnType<typeof vi.fn>
let disconnectMock: ReturnType<typeof vi.fn>

class ResizeObserverMock implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback
  }

  disconnect() { disconnectMock() }
  observe(target: Element) { observeMock(target) }
  unobserve() {}
}

function rect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  }
}

function Harness() {
  const { viewportRef, sceneScale, sceneInverseScale } = useGameplayViewport()
  return (
    <div ref={viewportRef} data-viewport>
      <output data-scale>{sceneScale}</output>
      <output data-inverse>{sceneInverseScale}</output>
    </div>
  )
}

function renderHarness() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => root.render(<Harness />))
  const readScale = () => Number(container.querySelector('[data-scale]')?.textContent)
  return {
    readScale,
    readInverseScale: () => Number(container.querySelector('[data-inverse]')?.textContent),
    unmount: () => act(() => {
      root.unmount()
      container.remove()
    }),
  }
}

beforeEach(() => {
  bounds = { width: 640, height: 360 }
  resizeObserverCallback = null
  observeMock = vi.fn()
  disconnectMock = vi.fn()
  visualViewportTarget = new EventTarget()
  originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  originalResizeObserver = globalThis.ResizeObserver
  originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  HTMLElement.prototype.getBoundingClientRect = () => rect(bounds.width, bounds.height)
  globalThis.ResizeObserver = ResizeObserverMock
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: visualViewportTarget,
  })
})

afterEach(() => {
  vi.useRealTimers()
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
  if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver
  else Reflect.deleteProperty(globalThis, 'ResizeObserver')
  if (originalVisualViewportDescriptor) Object.defineProperty(window, 'visualViewport', originalVisualViewportDescriptor)
  else Reflect.deleteProperty(window, 'visualViewport')
  document.body.replaceChildren()
})

describe('useGameplayViewport', () => {
  it('fits the logical scene by the limiting dimension and guards invalid measurements', () => {
    expect(fitGameplayScene(720, 810)).toBe(.5)
    expect(fitGameplayScene(1440, 405)).toBe(.5)
    expect(fitGameplayScene(0, 405)).toBe(1)
    expect(fitGameplayScene(1440, Number.NaN)).toBe(1)
  })

  it('does not continuously change scene scale during a visual viewport resize burst', () => {
    const harness = renderHarness()
    const initialScale = fitGameplayScene(640, 360)
    expect(harness.readScale()).toBeCloseTo(initialScale)
    expect(harness.readInverseScale()).toBeCloseTo(1 / initialScale)
    expect(observeMock).toHaveBeenCalledOnce()

    act(() => {
      for (const height of [352, 344, 336, 328]) {
        bounds.height = height
        visualViewportTarget.dispatchEvent(new Event('resize'))
      }
    })

    expect(harness.readScale()).toBeCloseTo(initialScale)
    harness.unmount()
    expect(disconnectMock).toHaveBeenCalledOnce()
  })

  it('updates scene scale immediately for a real observed container resize', () => {
    const harness = renderHarness()
    bounds = { width: 836, height: 470 }

    act(() => resizeObserverCallback?.([], {} as ResizeObserver))

    expect(harness.readScale()).toBeCloseTo(fitGameplayScene(836, 470))
    harness.unmount()
  })

  it('settles a window resize burst before reading the final container size', () => {
    vi.useFakeTimers()
    const harness = renderHarness()
    const initialScale = fitGameplayScene(640, 360)

    act(() => {
      for (const height of [350, 340, 330]) {
        bounds.height = height
        window.dispatchEvent(new Event('resize'))
      }
    })

    expect(harness.readScale()).toBeCloseTo(initialScale)
    act(() => vi.runAllTimers())
    expect(harness.readScale()).toBeCloseTo(fitGameplayScene(640, 330))
    harness.unmount()
  })
})
