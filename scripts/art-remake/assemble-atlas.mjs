import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export async function assembleAtlas({ frames, columns, rows, cellWidth, cellHeight, output }) {
  if (frames.length > columns * rows) throw new Error('Frame count exceeds atlas capacity')
  const composite = []
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]
    if (!frame) continue
    const metadata = await sharp(frame).metadata()
    if (metadata.width !== cellWidth || metadata.height !== cellHeight) {
      throw new Error(`${frame}: expected ${cellWidth}x${cellHeight}, found ${metadata.width}x${metadata.height}`)
    }
    composite.push({ input: frame, left: (index % columns) * cellWidth, top: Math.floor(index / columns) * cellHeight })
  }

  await fs.mkdir(path.dirname(output), { recursive: true })
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composite).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(output)
  return output
}
