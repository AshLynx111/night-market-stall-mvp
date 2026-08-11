import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const stageRoot = path.join(root, 'src', 'assets', 'approved', 'stages')
const recipes = ['big-eater', 'classic', 'orleans', 'signature', 'tenderloin']

async function pngs(directory) {
  return (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

const cumulativeFiles = (await Promise.all(recipes.map((recipe) => pngs(path.join(stageRoot, recipe))))).flat()
const heatFiles = (await Promise.all(recipes.map((recipe) => pngs(path.join(stageRoot, 'heat', recipe))))).flat()
const toppingFiles = await pngs(path.join(stageRoot, 'modifiers', 'toppings'))
const noScallionFiles = await pngs(path.join(stageRoot, 'modifiers', 'no-scallion'))
const modifierFiles = [...toppingFiles, ...noScallionFiles]
const atlasFiles = recipes.map((recipe) => path.join(stageRoot, `${recipe}-stage-atlas.png`))

async function validateTransparentStage(file) {
  const image = sharp(file).ensureAlpha()
  const metadata = await image.metadata()
  if (metadata.width !== 414 || metadata.height !== 414) {
    throw new Error(`${path.relative(root, file)} must be 414x414`)
  }
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const indexes = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    ((info.height * info.width) - 1) * info.channels,
  ]
  if (indexes.some((index) => data[index + 3] !== 0)) {
    throw new Error(`${path.relative(root, file)} has an opaque corner`)
  }
}

await Promise.all([...cumulativeFiles, ...heatFiles, ...modifierFiles].map(validateTransparentStage))
await Promise.all(atlasFiles.map((file) => fs.access(file)))

async function hash(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
}

const cumulativeHashes = await Promise.all(cumulativeFiles.map(hash))
let transitionDeltaVerified = true
for (const recipe of recipes) {
  const frames = await pngs(path.join(stageRoot, recipe))
  const hashes = await Promise.all(frames.map(hash))
  if (hashes.some((value, index) => index > 0 && value === hashes[index - 1])) transitionDeltaVerified = false
}

const result = {
  cumulative: cumulativeFiles.length,
  heat: heatFiles.length,
  modifiers: modifierFiles.length,
  atlases: atlasFiles.length,
  transparentCornersVerified: true,
  distinctCumulativeHashes: new Set(cumulativeHashes).size,
  transitionDeltaVerified,
}

if (result.cumulative !== 49 || result.heat !== 44 || result.modifiers !== 16 || result.atlases !== 5) {
  throw new Error(`Unexpected stage counts: ${JSON.stringify(result)}`)
}
if (!transitionDeltaVerified) throw new Error('At least one cumulative transition is pixel-identical to its predecessor')

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result)}\n`)
else process.stdout.write(`Validated ${result.cumulative + result.heat + result.modifiers + result.atlases} stage assets.\n`)
