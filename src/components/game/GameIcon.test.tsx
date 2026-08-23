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
})
