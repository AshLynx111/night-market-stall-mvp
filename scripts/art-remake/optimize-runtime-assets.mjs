import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export async function optimizeRuntimeAsset(input, output) {
  await fs.mkdir(path.dirname(output), { recursive: true })
  await sharp(input)
    .rotate()
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false, effort: 10 })
    .toFile(output)
  return output
}
