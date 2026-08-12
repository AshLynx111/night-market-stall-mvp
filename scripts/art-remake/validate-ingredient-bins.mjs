import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const ingredientBinIds = [
  'noodle',
  'egg',
  'hot-dog',
  'sauce',
  'scallion',
  'cilantro',
  'onion',
  'chili-powder',
  'turkey-noodle',
  'cheese',
  'corn',
  'orleans',
  'bacon',
  'tenderloin',
  'enoki',
]

export const ingredientBinDir = path.join(
  repoRoot,
  'src/assets/approved/menu/ingredient-bins',
)

function expectedFile(id) {
  return `ingredient-bin-${id}.png`
}

export async function validateIngredientBins() {
  const errors = []
  const hashes = new Map()
  let expectedDimensions = null

  const directoryEntries = await fs.readdir(ingredientBinDir).catch(() => [])
  const pngEntries = directoryEntries.filter((entry) => entry.toLowerCase().endsWith('.png')).sort()
  const expectedEntries = ingredientBinIds.map(expectedFile).sort()
  if (JSON.stringify(pngEntries) !== JSON.stringify(expectedEntries)) {
    const missing = expectedEntries.filter((entry) => !pngEntries.includes(entry))
    const extra = pngEntries.filter((entry) => !expectedEntries.includes(entry))
    if (missing.length) errors.push(`missing: ${missing.join(', ')}`)
    if (extra.length) errors.push(`unexpected: ${extra.join(', ')}`)
  }

  for (const id of ingredientBinIds) {
    const filename = expectedFile(id)
    const absolutePath = path.join(ingredientBinDir, filename)
    const buffer = await fs.readFile(absolutePath).catch(() => null)
    if (!buffer) continue

    const image = sharp(buffer)
    const metadata = await image.metadata().catch(() => null)
    if (!metadata) {
      errors.push(`${filename}: unreadable PNG`)
      continue
    }
    if (metadata.format !== 'png') errors.push(`${filename}: expected PNG`)
    if (metadata.depth !== 'uchar') errors.push(`${filename}: expected 8-bit channels`)
    if (metadata.channels !== 4 || !metadata.hasAlpha) errors.push(`${filename}: expected RGBA`)
    if (!metadata.width || !metadata.height) {
      errors.push(`${filename}: missing dimensions`)
      continue
    }
    const dimensions = `${metadata.width}x${metadata.height}`
    if (expectedDimensions === null) expectedDimensions = dimensions
    else if (dimensions !== expectedDimensions) {
      errors.push(`${filename}: ${dimensions}, expected ${expectedDimensions}`)
    }

    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const cornerCoordinates = [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1],
    ]
    for (const [x, y] of cornerCoordinates) {
      if (data[(y * info.width + x) * 4 + 3] > 16) {
        errors.push(`${filename}: corner (${x},${y}) is not transparent`)
      }
    }
    let subjectPixels = 0
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] >= 32) subjectPixels += 1
    }
    const coverage = subjectPixels / (info.width * info.height)
    if (coverage < 0.12 || coverage > 0.9) {
      errors.push(`${filename}: implausible subject coverage ${(coverage * 100).toFixed(1)}%`)
    }

    const hash = createHash('sha256').update(buffer).digest('hex')
    if (hashes.has(hash)) errors.push(`${filename}: duplicates ${hashes.get(hash)}`)
    else hashes.set(hash, filename)
  }

  if (errors.length) {
    throw new Error(`Ingredient bin validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }
  return { count: ingredientBinIds.length, dimensions: expectedDimensions }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateIngredientBins()
    .then(({ count, dimensions }) => console.log(`Validated ${count} ingredient bins at ${dimensions}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    })
}
