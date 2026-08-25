import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const FORBIDDEN_GAMEPLAY_EMOJI = ['😊', '💵', '☾', '♪', 'Ⅱ', '🔥', '🎵'] as const

async function productionSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return productionSourceFiles(target)
    if (!/\.(?:css|ts|tsx)$/.test(entry.name) || entry.name.includes('.test.')) return []
    return [target]
  }))
  return nested.flat()
}

describe('production gameplay icon contract', () => {
  it('keeps the original system emoji out of production source', async () => {
    const violations: string[] = []
    for (const filename of await productionSourceFiles(path.join(process.cwd(), 'src'))) {
      const source = await readFile(filename, 'utf8')
      for (const glyph of FORBIDDEN_GAMEPLAY_EMOJI) {
        if (source.includes(glyph)) violations.push(`${path.relative(process.cwd(), filename)}: ${glyph}`)
      }
    }

    expect(violations).toEqual([])
  })

  it('uses inline SVG for gameplay help and modal close controls', async () => {
    const source = await readFile(path.join(process.cwd(), 'src', 'components', 'LandscapeGame.tsx'), 'utf8')
    expect(source).not.toMatch(/className="help-fab"[^>]*>？<\/button>/)
    expect(source).not.toMatch(/className="modal-close"[^>]*>×<\/button>/)
    expect(source).toContain('<GameIcon name="help" />')
    expect(source).toContain('<GameIcon name="close" />')
  })

  it('covers baked select icons with the accepted 2.5D SVG family and distinguishes disabled upgrades', async () => {
    const css = await readFile(path.join(process.cwd(), 'src', 'landscape.css'), 'utf8')
    expect(css).toMatch(/\.select-screen \.upgrade-shop__icon\s*\{[^}]*display:\s*grid;/s)
    expect(css).toMatch(/\.select-screen \.upgrade-card-icon,\s*\.summary-screen \.upgrade-card-icon\s*\{[^}]*filter:\s*drop-shadow/s)
    expect(css).toMatch(/\.upgrade-shop > button:disabled\s*\{[^}]*background:[^}]*cursor:\s*not-allowed;/s)
    expect(css).toMatch(/\.upgrade-shop > button:disabled \.upgrade-shop__icon\s*\{[^}]*opacity:\s*1;[^}]*filter:\s*none;/s)
    expect(css).toMatch(/\.upgrade-shop > button:disabled \.upgrade-shop__copy > \*,\s*\.upgrade-shop > button:disabled \.upgrade-card-icon\s*\{[^}]*opacity:\s*\.62;/s)
  })
})
