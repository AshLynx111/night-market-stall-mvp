import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GameplayHud } from './GameplayHud'

describe('GameplayHud', () => {
  it('shows only the compact day, order, coin, pause, and sound information', () => {
    const markup = renderToStaticMarkup(
      <GameplayHud day={1} coins={36} served={2} target={5} sound onHome={vi.fn()} onPause={vi.fn()} onSound={vi.fn()} />,
    )
    expect(markup).toContain('第 1 天')
    expect(markup).toContain('订单 2/5')
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="2"')
    expect(markup).toContain('aria-valuemax="5"')
    expect(markup).toContain('aria-keyshortcuts="Escape"')
    expect(markup).toContain('aria-keyshortcuts="M"')
    expect(markup).toContain('¥36')
    expect(markup).not.toContain('满意度')
    expect(markup).not.toMatch(/😊|💵|☾|♪|Ⅱ/)
  })

  function renderPauseControl(onPause = vi.fn()) {
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(
      <GameplayHud day={1} coins={36} served={0} target={3} sound onHome={vi.fn()} onPause={onPause} onSound={vi.fn()} />,
    ))
    const pause = container.querySelector<HTMLButtonElement>('[aria-label="暂停并打开菜单"]')!
    return { onPause, pause, unmount: () => act(() => root.unmount()) }
  }

  it('fires a touch-derived activation exactly once', () => {
    const onPause = vi.fn()
    const { pause, unmount } = renderPauseControl(onPause)

    const pointerUp = new MouseEvent('pointerup', { bubbles: true, button: 0 })
    Object.defineProperties(pointerUp, {
      pointerType: { value: 'touch' },
      isPrimary: { value: true },
    })
    act(() => {
      pause.dispatchEvent(pointerUp)
      pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })

    expect(onPause).toHaveBeenCalledOnce()
    unmount()
  })

  it('fires a mouse activation exactly once', () => {
    const onPause = vi.fn()
    const { pause, unmount } = renderPauseControl(onPause)

    act(() => pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })))

    expect(onPause).toHaveBeenCalledOnce()
    unmount()
  })

  it.each(['Enter', ' '])('keeps native keyboard activation available for %j', (key) => {
    const onPause = vi.fn()
    const { pause, unmount } = renderPauseControl(onPause)

    expect(pause.tagName).toBe('BUTTON')
    expect(pause.type).toBe('button')
    act(() => {
      pause.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
      pause.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key }))
      pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }))
    })

    expect(onPause).toHaveBeenCalledOnce()
    unmount()
  })
})
