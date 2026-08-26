import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const screenPath = path.join(process.cwd(), 'src', 'components', 'LandscapeGame.tsx')

describe('English visual polish contract', () => {
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
})
