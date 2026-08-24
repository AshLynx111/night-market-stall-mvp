import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

interface RuntimeAssetReport {
  count: number
  sourceBytes: number
  runtimeBytes: number
  savedPercent: number
}

const CRITICAL_PLATES = [
  'main-ui/home-screen-user-final',
  'main-ui/day-select-user-final',
  'main-ui/settings-screen-user-final',
  'main-ui/summary-screen-user-final',
  'main-ui/night-market-clean-background',
  'main-ui/kitchen-screen-live-expanded-clean',
  'menu/menu-board',
  'events/day5-celebrity-event-key-art',
]

describe('runtime WebP asset contract', () => {
  it('keeps every derivative fresh and reduces aggregate bytes by at least 75 percent', () => {
    const report = JSON.parse(execFileSync(process.execPath, [
      'scripts/build-runtime-webp-assets.mjs', '--check', '--json',
    ], { encoding: 'utf8' })) as RuntimeAssetReport

    expect(report.count).toBeGreaterThanOrEqual(300)
    expect(report.runtimeBytes / report.sourceBytes).toBeLessThanOrEqual(.25)
    expect(report.savedPercent).toBeGreaterThanOrEqual(75)
    expect(JSON.parse(readFileSync('src/assets/runtime/manifest.json', 'utf8')).assets).toHaveLength(report.count)
  })

  it('keeps critical plates dimension-identical and visually near-lossless', async () => {
    for (const relative of CRITICAL_PLATES) {
      const sourcePath = path.join('src/assets/approved', `${relative}.png`)
      const runtimePath = path.join('src/assets/runtime', `${relative}.webp`)
      const sourceMetadata = await sharp(sourcePath).metadata()
      const runtimeMetadata = await sharp(runtimePath).metadata()
      expect(runtimeMetadata.width, relative).toBe(sourceMetadata.width)
      expect(runtimeMetadata.height, relative).toBe(sourceMetadata.height)

      const source = await sharp(sourcePath).removeAlpha().raw().toBuffer()
      const runtime = await sharp(runtimePath).removeAlpha().raw().toBuffer()
      expect(runtime.length, relative).toBe(source.length)
      let absoluteError = 0
      let squaredError = 0
      for (let index = 0; index < source.length; index += 1) {
        const difference = source[index] - runtime[index]
        absoluteError += Math.abs(difference)
        squaredError += difference * difference
      }
      const meanAbsoluteError = absoluteError / source.length
      const meanSquaredError = squaredError / source.length
      const psnr = 10 * Math.log10(65_025 / meanSquaredError)
      expect(meanAbsoluteError, `${relative} MAE`).toBeLessThanOrEqual(3)
      expect(psnr, `${relative} PSNR`).toBeGreaterThanOrEqual(35)
    }
  })
})
