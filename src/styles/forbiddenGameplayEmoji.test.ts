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
})
