import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'landscape.css')
const kitchenCssPath = path.join(process.cwd(), 'src', 'styles', 'kitchen.css')
const screenPath = path.join(process.cwd(), 'src', 'components', 'LandscapeGame.tsx')

describe('English visual polish contract', () => {
  it('defines two English type roles and locale-scoped material surfaces', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toContain('--font-display-en:')
    expect(css).toContain('--font-ui-en:')
    expect(css).toMatch(/html\[data-locale="en"\] \.home-screen__locale-title/)
    expect(css).toMatch(/html\[data-locale="en"\] \.day-card__locale-copy/)
    expect(css).toMatch(/html\[data-locale="en"\] \.summary-screen__locale-heading/)
  })

  it('renders a decorative English title without replacing home controls', async () => {
    const source = await readFile(screenPath, 'utf8')
    expect(source).toContain('home-screen__locale-title')
    expect(source).toContain('settings-screen__game-title')
    expect(source).toContain('profile-card__locale-label')
    expect(source).toContain("t('home.titlePrimary')")
    expect(source).toContain("t('home.titleSecondary')")
    expect(source.match(/className="home-hotspot home-hotspot--/g)).toHaveLength(5)
  })

  it('keeps English polish out of frozen character and approved-art imports', async () => {
    const source = await readFile(screenPath, 'utf8')
    expect(source).not.toContain('customerArt')
    expect(source).not.toContain('assets/approved')
  })

  it('does not use the old flat text-local masks', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).not.toMatch(/settings-screen__locale-copy strong[^}]*background:\s*#e6bd7d/s)
    expect(css).not.toMatch(/settings-screen__locale-label[^}]*background:\s*#efc579/s)
  })

  it('keeps the four English titles inside the original ornamental plaques', async () => {
    const css = await readFile(cssPath, 'utf8')
    const sharedRule = css.match(/html\[data-locale="en"\] \.home-screen__locale-title,\s*html\[data-locale="en"\] \.settings-screen__game-title\s*\{([^}]*)\}/s)?.[1] ?? ''
    const selectRule = css.match(/html\[data-locale="en"\] \.select-screen__locale-title\s*\{([^}]*)\}/s)?.[1] ?? ''
    const summaryRule = css.match(/html\[data-locale="en"\] \.summary-screen__locale-heading\s*\{([^}]*)\}/s)?.[1] ?? ''

    for (const rule of [sharedRule, selectRule, summaryRule]) {
      expect(rule).toContain('background: transparent')
      expect(rule).toContain('border: 0')
      expect(rule).toContain('box-shadow: none')
      expect(rule).not.toContain('var(--wood-grain-en)')
    }

    expect(css).toMatch(/\.settings-screen__game-title::before\s*\{[^}]*(?:-webkit-)?mask-image:/s)
    expect(css).toMatch(/\.select-screen__locale-title::before\s*\{[^}]*(?:-webkit-)?mask-image:/s)
    expect(css).toMatch(/\.summary-screen__locale-heading::before\s*\{[^}]*(?:-webkit-)?mask-image:/s)
    expect(css).toContain("url('./assets/locale/en/home-title-neutral.webp')")
    expect(css).toContain("url('./assets/locale/en/day-select-title-neutral.webp')")
    expect(css).toContain("url('./assets/locale/en/summary-title-neutral.webp')")
  })

  it('uses readable English hierarchy on textured day cards', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/html\[data-locale="en"\] \.day-card__locale-copy\s*\{[^}]*var\(--paper-grain-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy b\s*\{[^}]*clamp\(12px[^}]*var\(--font-display-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy span\s*\{[^}]*clamp\(10px[^}]*var\(--font-ui-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy em\s*\{[^}]*clamp\(10px[^}]*var\(--font-ui-en\)/s)
  })

  it('uses warm paper for gameplay notes and customer order slips', async () => {
    const css = await readFile(kitchenCssPath, 'utf8')
    expect(css).toMatch(/html\[data-locale="en"\] \.guided-tutorial[^}]*var\(--paper-grain-en\)/s)
    expect(css).toMatch(/html\[data-locale="en"\] \.kitchen-customer__bubble[^}]*var\(--paper-grain-en\)/s)
    expect(css).not.toMatch(/html\[data-locale="en"\] [^{]+\{[^}]*background:\s*#fff(?:fff)?\b/s)
  })

  it('integrates English summary copy into complete wood and paper faces', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/html\[data-locale="en"\] \.summary-screen__locale-heading::before\s*\{[^}]*(?:-webkit-)?mask-image:/s)
    expect(css).toMatch(/html\[data-locale="en"\] \.summary-stats > \.stat-card::before\s*\{[^}]*var\(--paper-grain-en\)/s)
    expect(css).not.toMatch(/summary-stat__label[^}]*background:\s*#f0d5a1/s)
    expect(css).toMatch(/html\[data-locale="en"\] \.summary-actions button span\s*\{[^}]*var\(--paper-grain-en\)/s)
    expect(css).toMatch(/html\[data-locale="en"\] \.dialogue-box\s*\{[^}]*var\(--paper-grain-en\)/s)
  })
})
