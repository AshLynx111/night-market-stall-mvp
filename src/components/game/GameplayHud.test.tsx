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

  it('activates a touch HUD control once even when a compatibility click follows', () => {
    const onPause = vi.fn()
    const container = document.createElement('div')
    const root = createRoot(container)
    act(() => root.render(
      <GameplayHud day={1} coins={36} served={0} target={3} sound onHome={vi.fn()} onPause={onPause} onSound={vi.fn()} />,
    ))
    const pause = container.querySelector('[aria-label="暂停并打开菜单"]')!
    const pointer = (type: string) => {
      const event = new MouseEvent(type, { bubbles: true })
      Object.defineProperty(event, 'pointerType', { value: 'touch' })
      act(() => pause.dispatchEvent(event))
    }

    pointer('pointerdown')
    pointer('pointerup')
    act(() => pause.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })))

    expect(onPause).toHaveBeenCalledOnce()
    act(() => root.unmount())
  })
})
