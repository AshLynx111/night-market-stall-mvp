import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GameIcon } from './GameIcon'

describe('GameIcon', () => {
  it('renders a replaceable inline svg without system emoji', () => {
    const markup = renderToStaticMarkup(<GameIcon name="coin" title="金币" />)
    expect(markup).toContain('<svg')
    expect(markup).toContain('<title>金币</title>')
    expect(markup).not.toMatch(/💵|😊|♪|☾/)
  })

  it('provides a platform-independent lock symbol', () => {
    const markup = renderToStaticMarkup(<GameIcon name="lock" title="未解锁" />)
    expect(markup).toContain('<title>未解锁</title>')
    expect(markup).toContain('<path')
    expect(markup).not.toContain('🔒')
  })

  it.each(['help', 'close'] as const)('provides a platform-independent %s control icon', (name) => {
    const markup = renderToStaticMarkup(<GameIcon name={name} />)
    expect(markup).toContain(`data-game-icon="${name}"`)
    expect(markup).toContain('<path')
    expect(markup).not.toMatch(/[？×]/)
  })
})
