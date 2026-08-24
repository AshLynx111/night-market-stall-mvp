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
})
