import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { buildContactSheet } from './build-contact-sheet.mjs'

const root = process.cwd()
const customerRoot = path.join(root, 'src', 'assets', 'approved', 'customers')
const masterRoot = path.join(root, 'artifacts', 'reference-remake', 'masters', 'customers', 'expression-sheets')
const reviewRoot = path.join(root, 'artifacts', 'reference-remake', 'review')

const identities = [
  'customer-01-xiaolin', 'customer-02-ajie', 'customer-03-xiaoyu', 'customer-04-senior',
  'customer-05-suqing', 'customer-06-dazhuang', 'customer-07-xuyan', 'customer-08-azhe',
  'customer-09-teacher-chen', 'customer-10-grandma-wang',
]
const emotions = ['arriving', 'ordering', 'waiting', 'impatient', 'urgent', 'happy', 'disappointed']

async function writeImage(image, output) {
  await fs.mkdir(path.dirname(output), { recursive: true })
  const temporary = `${output}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp.png`
  await image.toFile(temporary)
  try {
    let lastError
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await fs.copyFile(temporary, output)
        lastError = undefined
        break
      } catch (error) {
        lastError = error
        await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)))
      }
    }
    if (lastError) throw lastError
  } finally {
    await fs.unlink(temporary).catch(() => {})
  }
}

function keepLargestAlphaComponent(data, info) {
  const pixels = info.width * info.height
  const labels = new Int32Array(pixels)
  const counts = [0]
  let nextLabel = 0
  const stack = []

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (data[pixel * info.channels + 3] <= 8 || labels[pixel] !== 0) continue
    nextLabel += 1
    let count = 0
    labels[pixel] = nextLabel
    stack.push(pixel)
    while (stack.length > 0) {
      const current = stack.pop()
      count += 1
      const x = current % info.width
      const y = Math.floor(current / info.width)
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue
          const neighbor = ny * info.width + nx
          if (labels[neighbor] !== 0 || data[neighbor * info.channels + 3] <= 8) continue
          labels[neighbor] = nextLabel
          stack.push(neighbor)
        }
      }
    }
    counts[nextLabel] = count
  }

  let largestLabel = 0
  for (let label = 1; label < counts.length; label += 1) {
    if ((counts[label] ?? 0) > (counts[largestLabel] ?? 0)) largestLabel = label
  }
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (labels[pixel] !== largestLabel) data[pixel * info.channels + 3] = 0
  }
  return data
}

async function extractEmotion(sheet, metadata, index) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const left = Math.floor((column * metadata.width) / 4)
  const right = Math.floor(((column + 1) * metadata.width) / 4)
  const top = Math.floor((row * metadata.height) / 2)
  const bottom = Math.floor(((row + 1) * metadata.height) / 2)
  const { data, info } = await sharp(sheet)
    .extract({ left, top, width: right - left, height: bottom - top })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  keepLargestAlphaComponent(data, info)
  return sharp(data, { raw: info })
    .resize(384, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
}

async function motionFrame(file, frameIndex) {
  const widths = [188, 202, 216, 230, 195, 209, 223, 237]
  const horizontalOffsets = [0, 0, 0, 0, 0, 0, 0, 0]
  const trimmed = await sharp(file)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
  const width = widths[frameIndex]
  const rendered = await sharp(trimmed)
    .ensureAlpha()
    .resize(width, 368, {
      fit: 'contain',
      position: 'bottom',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
  return {
    input: rendered,
    left: Math.round((256 - width) / 2) + horizontalOffsets[frameIndex],
    top: 8,
  }
}

async function buildMotionAtlas(identity, files) {
  const rows = [
    ['arriving', 'ordering', 'arriving', 'waiting', 'arriving', 'ordering', 'arriving', 'waiting'],
    ['waiting', 'impatient', 'waiting', 'ordering', 'waiting', 'urgent', 'waiting', 'ordering'],
    ['happy', 'arriving', 'ordering', 'disappointed', 'urgent', 'waiting', 'impatient', 'happy'],
  ]
  const composites = []
  for (let row = 0; row < rows.length; row += 1) {
    for (let column = 0; column < rows[row].length; column += 1) {
      const cell = await motionFrame(files.get(rows[row][column]), column)
      composites.push({ ...cell, left: column * 256 + cell.left, top: row * 384 + cell.top })
    }
  }
  const output = path.join(customerRoot, 'motion', `${identity}-motion.png`)
  await writeImage(sharp({
    create: { width: 2048, height: 1152, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(composites).png({ compressionLevel: 9, adaptiveFiltering: false }), output)
}

const contactItems = []
for (const identity of identities) {
  const sheet = path.join(masterRoot, `${identity}-keyed.png`)
  const metadata = await sharp(sheet).metadata()
  const files = new Map()
  for (let index = 0; index < emotions.length; index += 1) {
    const emotion = emotions[index]
    const buffer = await extractEmotion(sheet, metadata, index)
    const output = path.join(customerRoot, 'emotions', identity, `${emotion}.png`)
    await writeImage(sharp(buffer), output)
    files.set(emotion, output)
    contactItems.push({ path: output })
  }

  const waiting = files.get('waiting')
  await writeImage(sharp(waiting).ensureAlpha().resize(330, 449, { fit: 'fill' }).png({ compressionLevel: 9 }), path.join(customerRoot, 'final-light-anime', `${identity}.png`))
  await writeImage(sharp(waiting).ensureAlpha().resize(1024, 1024, {
    fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png({ compressionLevel: 9 }), path.join(customerRoot, `${identity}.png`))
  await buildMotionAtlas(identity, files)
}

await buildContactSheet(contactItems, path.join(reviewRoot, 'regular-customer-emotions-contact-sheet.png'), {
  columns: 7,
  cellWidth: 220,
  cellHeight: 280,
  background: '#142033',
})

process.stdout.write(`Built ${identities.length} regular customers with ${emotions.length} emotions each.\n`)
