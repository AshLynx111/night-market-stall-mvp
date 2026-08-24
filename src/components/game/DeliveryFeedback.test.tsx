import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeliveryFeedback, qualityLabel } from './DeliveryFeedback'

describe('DeliveryFeedback', () => {
  it('maps existing quality values to short Chinese feedback', () => {
    expect(qualityLabel(95)).toBe('完美')
    expect(qualityLabel(82)).toBe('很好')
    expect(qualityLabel(60)).toBe('可以')
    const markup = renderToStaticMarkup(<DeliveryFeedback feedback={{ id: 1, income: 9, quality: 95 }} />)
    expect(markup).toContain('+¥9')
    expect(markup).toContain('aria-atomic="true"')
  })
})
