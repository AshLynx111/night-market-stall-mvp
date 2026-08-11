import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

interface ManifestAsset {
  path: string
  family: string
  role: string
  width: number | null
  height: number | null
  alphaRequired: boolean
  derivedFrom?: string
}

describe('full reference-remake art contract', () => {
  it('tracks every approved asset and all required visual families', () => {
    const raw = execFileSync(process.execPath, ['scripts/full-art-manifest.mjs', '--json'], {
      encoding: 'utf8',
    })
    const manifest = JSON.parse(raw) as { assets: ManifestAsset[] }

    expect(manifest.assets).toHaveLength(251)
    expect(new Set(manifest.assets.map((asset) => asset.family))).toEqual(new Set([
      'customers',
      'events',
      'main-ui',
      'menu',
      'stages',
    ]))
    expect(manifest.assets.map((asset) => asset.path)).toEqual(
      [...manifest.assets.map((asset) => asset.path)].sort(),
    )
  })

  it('records dimensions and derivation for every raster contract', () => {
    const raw = execFileSync(process.execPath, ['scripts/full-art-manifest.mjs', '--json'], {
      encoding: 'utf8',
    })
    const manifest = JSON.parse(raw) as { assets: ManifestAsset[] }
    const pngs = manifest.assets.filter((asset) => asset.path.endsWith('.png'))

    expect(pngs).toHaveLength(250)
    expect(pngs.every((asset) => Number(asset.width) > 0 && Number(asset.height) > 0)).toBe(true)
    expect(manifest.assets.filter((asset) => asset.derivedFrom).map((asset) => asset.path)).toEqual(
      expect.arrayContaining([
        'customers/motion/celebrity-motion.png',
        'menu/menu-board.png',
        'stages/classic-stage-atlas.png',
      ]),
    )
  })
})
