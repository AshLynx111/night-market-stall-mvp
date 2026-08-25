import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UpgradeCardIcon, type UpgradeCardIconKind } from './UpgradeCardIcon'

describe('UpgradeCardIcon', () => {
  it.each(['funds', 'fire', 'sign'] as UpgradeCardIconKind[])(
    'renders the %s variant with the shared flat SVG contract',
    (kind) => {
      const markup = renderToStaticMarkup(<UpgradeCardIcon kind={kind} />)

      expect(markup).toContain(`data-upgrade-card-icon="${kind}"`)
      expect(markup).toContain('viewBox="0 0 48 48"')
      expect(markup).toContain('stroke-width="2"')
      expect(markup).toContain('stroke-linecap="round"')
      expect(markup).toContain('stroke-linejoin="round"')
      expect(markup).toContain('aria-hidden="true"')
      expect(markup).toContain('upgrade-card-icon__main')
      expect(markup).toContain('upgrade-card-icon__accent')
      expect(markup).not.toMatch(/<img|<image|filter=|😊|💰|🔥|🏮/)
    },
  )
})
