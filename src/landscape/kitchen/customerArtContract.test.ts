import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

interface CustomerValidation {
  identities: number
  emotions: number
  motionAtlases: number
  neutralExports: number
  sourceExports: number
  transparentCornersVerified: boolean
  emotionDiversityVerified: boolean
  motionGeometryVerified: boolean
}

describe('reference-remake regular customer art contract', () => {
  it('exports ten distinct customers with seven emotions and motion atlases', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/art-remake/validate-customer-art.mjs', '--regular-only', '--json',
    ], { encoding: 'utf8' })) as CustomerValidation

    expect(result.identities).toBe(10)
    expect(result.emotions).toBe(70)
    expect(result.motionAtlases).toBe(10)
    expect(result.neutralExports).toBe(10)
    expect(result.sourceExports).toBe(10)
    expect(result.transparentCornersVerified).toBe(true)
    expect(result.emotionDiversityVerified).toBe(true)
    expect(result.motionGeometryVerified).toBe(true)
  })
})
