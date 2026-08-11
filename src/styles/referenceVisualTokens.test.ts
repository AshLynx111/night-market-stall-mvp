import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
const landscapeCss = readFileSync(path.join(repoRoot, 'src/landscape.css'), 'utf8')
const kitchenCss = readFileSync(path.join(repoRoot, 'src/styles/kitchen.css'), 'utf8')

describe('reference-led visual foundation', () => {
  it('defines one shared wood, cream, green, gold, danger and shadow palette', () => {
    for (const token of ['--ui-wood:', '--ui-cream:', '--ui-green:', '--ui-gold:', '--ui-danger:', '--ui-shadow:']) {
      expect(landscapeCss).toContain(token)
    }
  })

  it('keeps ingredient and griddle controls visually transparent over painted art', () => {
    expect(kitchenCss).toMatch(/\.table-ingredient\s*\{[^}]*background:\s*transparent/s)
    expect(kitchenCss).toMatch(/\.griddle-slot\s*\{[^}]*background:\s*transparent/s)
  })

  it('exports both runtime scene plates at the logical 1440 by 810 canvas', async () => {
    for (const file of ['night-market-clean-background.png', 'game-main-screen-final.png']) {
      const metadata = await sharp(path.join(repoRoot, 'src/assets/approved/main-ui', file)).metadata()
      expect([metadata.width, metadata.height]).toEqual([1440, 810])
    }
  })
})
