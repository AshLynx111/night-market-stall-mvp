import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterEach, describe, expect, it } from 'vitest'
import { exportCutout } from './export-cutout.mjs'
import { assembleAtlas } from './assemble-atlas.mjs'
import { buildContactSheet } from './build-contact-sheet.mjs'
import { optimizeRuntimeAsset } from './optimize-runtime-assets.mjs'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'night-market-art-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })))
})

async function sha256(filePath: string): Promise<string> {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function solidPng(filePath: string, width: number, height: number, rgba: [number, number, number, number]) {
  await sharp({
    create: { width, height, channels: 4, background: { r: rgba[0], g: rgba[1], b: rgba[2], alpha: rgba[3] / 255 } },
  }).png().toFile(filePath)
}

describe('reference remake export tools', () => {
  it('removes a flat chroma border while preserving opaque subject pixels', async () => {
    const directory = await temporaryDirectory()
    const source = path.join(directory, 'source.png')
    const output = path.join(directory, 'cutout.png')
    const pixels = Buffer.alloc(8 * 8 * 4, 255)
    for (let index = 0; index < 8 * 8; index += 1) {
      pixels[index * 4] = 0
      pixels[index * 4 + 1] = 255
      pixels[index * 4 + 2] = 0
    }
    for (let y = 2; y < 6; y += 1) {
      for (let x = 2; x < 6; x += 1) {
        const offset = (y * 8 + x) * 4
        pixels[offset] = 210
        pixels[offset + 1] = 60
        pixels[offset + 2] = 32
      }
    }
    await sharp(pixels, { raw: { width: 8, height: 8, channels: 4 } }).png().toFile(source)

    await exportCutout(source, output, { key: [0, 255, 0], transparentThreshold: 12, opaqueThreshold: 220 })

    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4)
    expect(data[3]).toBe(0)
    expect(data[((3 * 8 + 3) * 4) + 3]).toBe(255)
  })

  it('assembles exact atlas cells and keeps unused cells transparent', async () => {
    const directory = await temporaryDirectory()
    const red = path.join(directory, 'red.png')
    const blue = path.join(directory, 'blue.png')
    const atlas = path.join(directory, 'atlas.png')
    await solidPng(red, 4, 4, [255, 0, 0, 255])
    await solidPng(blue, 4, 4, [0, 0, 255, 255])

    await assembleAtlas({ frames: [red, blue], columns: 2, rows: 2, cellWidth: 4, cellHeight: 4, output: atlas })

    const metadata = await sharp(atlas).metadata()
    const { data } = await sharp(atlas).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([metadata.width, metadata.height]).toEqual([8, 8])
    expect(data[((6 * 8 + 2) * 4) + 3]).toBe(0)
  })

  it('produces byte-stable optimized output and a complete contact sheet', async () => {
    const directory = await temporaryDirectory()
    const source = path.join(directory, 'source.png')
    const first = path.join(directory, 'first.png')
    const second = path.join(directory, 'second.png')
    const sheet = path.join(directory, 'sheet.png')
    await solidPng(source, 16, 12, [205, 102, 40, 255])

    await optimizeRuntimeAsset(source, first)
    await optimizeRuntimeAsset(source, second)
    await buildContactSheet([{ path: source, label: 'fixture' }], sheet, { columns: 1, cellWidth: 32, cellHeight: 32 })

    expect(await sha256(first)).toBe(await sha256(second))
    expect((await sharp(sheet).metadata()).width).toBe(32)
    expect((await sharp(sheet).metadata()).height).toBe(32)
  })
})
