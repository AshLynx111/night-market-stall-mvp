import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

interface CelebrityValidation {
  identities: number
  emotions: number
  motionAtlases: number
  eventKeyArt: number
  transparentCornersVerified: boolean
  emotionDiversityVerified: boolean
  motionGeometryVerified: boolean
  eventGeometryVerified: boolean
}

describe('reference-remake Day 5 celebrity art contract', () => {
  it('exports the approved handsome celebrity across event, emotion and motion art', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/art-remake/validate-customer-art.mjs', '--celebrity-only', '--json',
    ], { encoding: 'utf8' })) as CelebrityValidation

    expect(result.identities).toBe(1)
    expect(result.emotions).toBe(7)
    expect(result.motionAtlases).toBe(1)
    expect(result.eventKeyArt).toBe(1)
    expect(result.transparentCornersVerified).toBe(true)
    expect(result.emotionDiversityVerified).toBe(true)
    expect(result.motionGeometryVerified).toBe(true)
    expect(result.eventGeometryVerified).toBe(true)
  })
})
