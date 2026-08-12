import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ingredient bin art contract', () => {
  it('ships fifteen distinct, dimension-matched transparent RGBA bin assets', () => {
    const validator = path.resolve('scripts/art-remake/validate-ingredient-bins.mjs')
    expect(() => execFileSync(process.execPath, [validator], { stdio: 'pipe' })).not.toThrow()
  })
})
