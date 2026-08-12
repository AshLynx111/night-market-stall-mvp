import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { buildLiveKitchenPlate, cleanPath, outputPath } from './build-live-kitchen-plate.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })))
})

test('rebuilds the kitchen plate byte-for-byte from tracked art inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'kitchen-plate-'))
  temporaryDirectories.push(directory)
  const rebuiltPath = join(directory, 'kitchen-screen-live-clean.png')

  await buildLiveKitchenPlate({ output: rebuiltPath })

  const [source, expected, rebuilt] = await Promise.all([readFile(cleanPath), readFile(outputPath), readFile(rebuiltPath)])
  expect(createHash('sha256').update(source).digest('hex')).toBe('3c7046b8a5a4736ad79c414dfaf3819930095fa3bc61b1c2f95affe5dac5084c')
  expect(createHash('sha256').update(rebuilt).digest('hex')).toBe(createHash('sha256').update(expected).digest('hex'))
})
