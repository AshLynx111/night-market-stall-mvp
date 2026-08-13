import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import {
  EMPTY_BIN_INTERIOR_POLYGONS,
  buildLiveKitchenPlate,
  cleanPath,
  emptyBinsPath,
  outputPath,
} from './build-live-kitchen-plate.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })))
})

test('rebuilds the kitchen plate byte-for-byte from tracked art inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kitchen-plate-'))
  temporaryDirectories.push(directory)
  const rebuiltPath = join(directory, 'kitchen-screen-live-clean.png')

  await buildLiveKitchenPlate({ output: rebuiltPath })

  const [source, emptyBins, expected, rebuilt] = await Promise.all([readFile(cleanPath), readFile(emptyBinsPath), readFile(outputPath), readFile(rebuiltPath)])
  expect(createHash('sha256').update(source).digest('hex')).toBe('3c7046b8a5a4736ad79c414dfaf3819930095fa3bc61b1c2f95affe5dac5084c')
  expect(createHash('sha256').update(emptyBins).digest('hex')).toBe('ad36f73c4db3524da46c7e2dfac2847995ced82db46bba046bca61f0084d6673')
  expect(EMPTY_BIN_INTERIOR_POLYGONS).toHaveLength(6)
  expect(createHash('sha256').update(rebuilt).digest('hex')).toBe(createHash('sha256').update(expected).digest('hex'))
})

test('changes the customer-clean live plate only inside the six localized empty-bin masks', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kitchen-bin-locality-'))
  temporaryDirectories.push(directory)
  const customerOnlyPath = join(directory, 'customer-only.png')
  const withEmptyBinsPath = join(directory, 'with-empty-bins.png')

  await buildLiveKitchenPlate({ output: customerOnlyPath, includeEmptyBins: false })
  await buildLiveKitchenPlate({ output: withEmptyBinsPath })

  const [{ data: before, info }, { data: after }] = await Promise.all([
    (await import('sharp')).default(customerOnlyPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    (await import('sharp')).default(withEmptyBinsPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  const inside = (x, y, polygon) => {
    let result = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i]
      const b = polygon[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) result = !result
    }
    return result
  }
  let changedInside = 0
  let changedOutside = 0
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * info.channels
    const changed = before[offset] !== after[offset] || before[offset + 1] !== after[offset + 1] || before[offset + 2] !== after[offset + 2]
    if (!changed) continue
    if (EMPTY_BIN_INTERIOR_POLYGONS.some((polygon) => inside(x + .5, y + .5, polygon))) changedInside += 1
    else changedOutside += 1
  }
  expect(changedInside).toBeGreaterThan(10_000)
  expect(changedOutside).toBe(0)
})
