import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const cssPath = path.join(process.cwd(), 'src', 'landscape.css')
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

  it('uses readable English hierarchy on textured day cards', async () => {
    const css = await readFile(cssPath, 'utf8')
    expect(css).toMatch(/html\[data-locale="en"\] \.day-card__locale-copy\s*\{[^}]*var\(--paper-grain-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy b\s*\{[^}]*clamp\(12px[^}]*var\(--font-display-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy span\s*\{[^}]*clamp\(10px[^}]*var\(--font-ui-en\)/s)
    expect(css).toMatch(/\.day-card__locale-copy em\s*\{[^}]*clamp\(10px[^}]*var\(--font-ui-en\)/s)
  })
})
