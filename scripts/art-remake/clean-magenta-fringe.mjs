import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const classicRoot = path.resolve(scriptDir, '../../src/assets/approved/stages/classic')
const files = [
  'classic-01-noodle.png',
  'classic-02-egg.png',
  'classic-03-hot-dog.png',
  'classic-04-sauce.png',
  'classic-05-scallion.png',
  'classic-06-cut.png',
  'classic-07-roll.png',
]

for (const filename of files) {
  const target = path.join(classicRoot, filename)
  const { data, info } = await sharp(target).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  for (let offset = 0; offset < data.length; offset += 4) {
    const red = data[offset]
    const green = data[offset + 1]
    const blue = data[offset + 2]
    const magentaExcess = Math.min(red - green, blue - green)
    if (magentaExcess <= 10) continue

    data[offset + 3] = 0
  }

  const corners = [
    3,
    (info.width - 1) * 4 + 3,
    (info.height - 1) * info.width * 4 + 3,
    ((info.height * info.width) - 1) * 4 + 3,
  ]
  let image = sharp(data, { raw: info })
  if (corners.some((offset) => data[offset] > 0)) {
    image = image
      .resize(info.width - 16, info.height - 16, { fit: 'contain' })
      .extend({ top: 8, right: 8, bottom: 8, left: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  }
  await image.png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(`${target}.tmp.png`)
  await sharp(`${target}.tmp.png`).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(target)
  await import('node:fs/promises').then(({ unlink }) => unlink(`${target}.tmp.png`))
}

process.stdout.write(`Removed magenta fringe from ${files.length} cumulative classic stages.\n`)
