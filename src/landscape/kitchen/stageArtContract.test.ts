import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

interface StageValidation {
  cumulative: number
  heat: number
  modifiers: number
  atlases: number
  transparentCornersVerified: boolean
  distinctCumulativeHashes: number
  transitionDeltaVerified: boolean
}

describe('reference-remake cooking stage art contract', () => {
  it('exports every cumulative, heat, modifier and atlas asset', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/art-remake/validate-stage-art.mjs', '--json'], {
      encoding: 'utf8',
    })) as StageValidation

    expect(result.cumulative).toBe(49)
    expect(result.heat).toBe(44)
    expect(result.modifiers).toBe(16)
    expect(result.atlases).toBe(5)
    expect(result.transparentCornersVerified).toBe(true)
    expect(result.distinctCumulativeHashes).toBeGreaterThanOrEqual(30)
    expect(result.transitionDeltaVerified).toBe(true)
  })
})
