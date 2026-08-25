import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UpgradeCardIcon, type UpgradeCardIconKind } from './UpgradeCardIcon'

describe('UpgradeCardIcon', () => {
  const forms: Record<UpgradeCardIconKind, string> = {
    funds: 'pouch',
    fire: 'stove',
    sign: 'plaque',
  }

  it.each(['funds', 'fire', 'sign'] as UpgradeCardIconKind[])(
    'renders the %s variant with the shared warm 2.5D SVG contract',
    (kind) => {
      const markup = renderToStaticMarkup(<UpgradeCardIcon kind={kind} />)

      expect(markup).toContain(`data-upgrade-card-icon="${kind}"`)
      expect(markup).toContain(`data-icon-form="${forms[kind]}"`)
      expect(markup).toContain('viewBox="0 0 48 48"')
      expect(markup).toContain('stroke-width="2.6"')
      expect(markup).toContain('stroke-linecap="round"')
      expect(markup).toContain('stroke-linejoin="round"')
      expect(markup).toContain('aria-hidden="true"')
      expect(markup).toContain(`id="${kind}-body"`)
      expect(markup).toContain(`id="${kind}-accent"`)
      expect(markup).toContain(`id="${kind}-inset"`)
      expect(markup).toContain('upgrade-card-icon__body')
      expect(markup).toContain('upgrade-card-icon__accent')
      expect(markup).toContain('upgrade-card-icon__shade')
      expect(markup).toContain('upgrade-card-icon__highlight')
      expect(markup).toContain('upgrade-card-icon__detail')
      expect(markup).not.toMatch(/<img|<image|😊|💰|🔥|🏮/)
    },
  )
})
