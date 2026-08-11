import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

export async function buildContactSheet(items, output, options = {}) {
  const { columns = 4, cellWidth = 320, cellHeight = 240, background = '#1a2130' } = options
  const rows = Math.max(1, Math.ceil(items.length / columns))
  const composite = []

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const rendered = await sharp(item.path)
      .resize(cellWidth, cellHeight, { fit: 'contain', withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: false })
      .toBuffer()
    composite.push({
      input: rendered,
      left: (index % columns) * cellWidth,
      top: Math.floor(index / columns) * cellHeight,
      gravity: 'centre',
    })
  }

  await fs.mkdir(path.dirname(output), { recursive: true })
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * cellHeight,
      channels: 4,
      background,
    },
  }).composite(composite).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(output)
  return output
}
