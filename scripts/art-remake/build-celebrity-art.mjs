import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { buildContactSheet } from './build-contact-sheet.mjs'

const root = process.cwd()
const customerRoot = path.join(root, 'src', 'assets', 'approved', 'customers')
const sheet = path.join(root, 'artifacts', 'reference-remake', 'masters', 'customers', 'expression-sheets', 'celebrity-keyed.png')
const reviewRoot = path.join(root, 'artifacts', 'reference-remake', 'review')
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

function keepLargestComponent(data, info) {
  const pixels = info.width * info.height
  const labels = new Int32Array(pixels)
  const counts = [0]
  const stack = []
  let label = 0
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (labels[pixel] || data[pixel * info.channels + 3] <= 8) continue
    label += 1
    labels[pixel] = label
    stack.push(pixel)
    let count = 0
    while (stack.length) {
      const current = stack.pop()
      count += 1
      const x = current % info.width
      const y = Math.floor(current / info.width)
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height) continue
          const neighbor = ny * info.width + nx
          if (labels[neighbor] || data[neighbor * info.channels + 3] <= 8) continue
          labels[neighbor] = label
          stack.push(neighbor)
        }
      }
    }
    counts[label] = count
  }
  let largest = 0
  for (let candidate = 1; candidate < counts.length; candidate += 1) {
    if ((counts[candidate] ?? 0) > (counts[largest] ?? 0)) largest = candidate
  }
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (labels[pixel] !== largest) data[pixel * info.channels + 3] = 0
  }
}

async function extractCell(metadata, index) {
  const column = index % 4
  const row = Math.floor(index / 4)
  const left = Math.floor(column * metadata.width / 4)
  const right = Math.floor((column + 1) * metadata.width / 4)
  const top = Math.floor(row * metadata.height / 2)
  const bottom = Math.floor((row + 1) * metadata.height / 2)
  const { data, info } = await sharp(sheet).extract({ left, top, width: right - left, height: bottom - top }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  keepLargestComponent(data, info)
  return sharp(data, { raw: info }).resize(384, 512, {
    fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer()
}

async function motionCell(file, index) {
  const widths = [208, 214, 220, 216, 212, 218, 210, 224]
  const offsets = [-2, 1, 0, 2, -1, 1, 2, 0]
  const trimmed = await sharp(file).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const width = widths[index]
  return {
    input: await sharp(trimmed).ensureAlpha().resize(width, 368, {
      fit: 'contain', position: 'bottom', background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png({ compressionLevel: 9 }).toBuffer(),
    left: Math.round((256 - width) / 2) + offsets[index],
    top: 8,
  }
}

const metadata = await sharp(sheet).metadata()
const files = new Map()
const contactItems = []
for (let index = 0; index < emotions.length; index += 1) {
  const emotion = emotions[index]
  const output = path.join(customerRoot, 'emotions', 'celebrity', `${emotion}.png`)
  await writeImage(sharp(await extractCell(metadata, index)), output)
  files.set(emotion, output)
  contactItems.push({ path: output })
}

const rows = [
  ['arriving', 'ordering', 'arriving', 'waiting', 'arriving', 'ordering', 'arriving', 'waiting'],
  ['waiting', 'impatient', 'waiting', 'ordering', 'waiting', 'urgent', 'waiting', 'ordering'],
  ['happy', 'arriving', 'ordering', 'disappointed', 'urgent', 'waiting', 'impatient', 'happy'],
]
const composites = []
for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 8; column += 1) {
    const cell = await motionCell(files.get(rows[row][column]), column)
    composites.push({ ...cell, left: column * 256 + cell.left, top: row * 384 + cell.top })
  }
}
await writeImage(sharp({
  create: { width: 2048, height: 1152, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).composite(composites).png({ compressionLevel: 9, adaptiveFiltering: false }), path.join(customerRoot, 'motion', 'celebrity-motion.png'))

await buildContactSheet(contactItems, path.join(reviewRoot, 'celebrity-emotions-contact-sheet.png'), {
  columns: 7, cellWidth: 250, cellHeight: 320, background: '#142033',
})
process.stdout.write('Built Day 5 celebrity emotions and motion atlas.\n')
