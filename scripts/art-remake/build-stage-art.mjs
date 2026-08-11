import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { buildContactSheet } from './build-contact-sheet.mjs'

const root = process.cwd()
const stageRoot = path.join(root, 'src', 'assets', 'approved', 'stages')
const menuRoot = path.join(root, 'src', 'assets', 'approved', 'menu')
const masterRoot = path.join(root, 'artifacts', 'reference-remake', 'masters', 'stages')
const reviewRoot = path.join(root, 'artifacts', 'reference-remake', 'review')
const size = 414

const recipes = {
  classic: ['empty', 'noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  'big-eater': ['empty', 'noodle', 'egg', 'second-noodle', 'second-egg', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  orleans: ['empty', 'noodle', 'egg', 'orleans', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  signature: ['empty', 'noodle', 'egg', 'turkey-noodle', 'cheese', 'corn', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  tenderloin: ['empty', 'noodle', 'egg', 'turkey-noodle', 'tenderloin', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
}

async function writeStageContactSheet(files) {
  await buildContactSheet(files.map((file) => ({ path: file })), path.join(reviewRoot, 'stage-contact-sheet.png'), {
    columns: 7,
    cellWidth: 220,
    cellHeight: 220,
    background: '#142033',
  })
}

if (process.argv.includes('--contact-only')) {
  const existing = []
  for (const recipe of Object.keys(recipes)) {
    const directory = path.join(stageRoot, recipe)
    const names = (await fs.readdir(directory)).filter((name) => name.endsWith('.png')).sort((a, b) => a.localeCompare(b, 'en'))
    existing.push(...names.map((name) => path.join(directory, name)))
  }
  await writeStageContactSheet(existing)
  process.stdout.write(`Built stage contact sheet from ${existing.length} files.\n`)
  process.exit(0)
}

const stageNames = {
  classic: ['empty', 'noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  'big-eater': ['empty', 'noodle', 'egg', 'second-noodle', 'second-egg', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  orleans: ['empty', 'noodle', 'egg', 'orleans', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  signature: ['empty', 'noodle', 'egg', 'turkey-noodle', 'cheese', 'corn', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  tenderloin: ['empty', 'noodle', 'egg', 'turkey-noodle', 'tenderloin', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
}

const ingredientPath = (name) => path.join(menuRoot, 'ingredients', `ingredient-${name}.png`)
const masterPath = (name) => path.join(masterRoot, `${name}.png`)

async function fit(file, width, height = width) {
  return sharp(file)
    .ensureAlpha()
    .resize(width, height, {
      fit: 'contain',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer()
}

async function layer(file, width, height, left, top) {
  return { input: await fit(file, width, height), left, top }
}

async function transparentCanvas() {
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
}

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

function primaryIngredient(recipe) {
  if (recipe === 'classic') return 'hot-dog'
  if (recipe === 'orleans') return 'orleans-chicken'
  if (recipe === 'signature') return 'turkey-noodle'
  if (recipe === 'tenderloin') return 'tenderloin'
  return null
}

async function cumulativeLayers(recipe, action, history) {
  if (action === 'empty') return []
  if (action === 'pack') return [await layer(path.join(menuRoot, 'takeaway-bag.png'), 290, 330, 62, 42)]

  if (action === 'cut' || action === 'roll') {
    const layers = [await layer(masterPath(action === 'cut' ? 'cut-plain' : 'roll-plain'), 376, 376, 19, 19)]
    const primary = primaryIngredient(recipe)
    if (primary) layers.push(await layer(ingredientPath(primary), action === 'cut' ? 130 : 100, action === 'cut' ? 88 : 72, action === 'cut' ? 142 : 157, action === 'cut' ? 168 : 176))
    if (history.includes('scallion')) layers.push(await layer(ingredientPath('scallion'), 90, 64, 162, 166))
    return layers
  }

  const layers = [await layer(masterPath('noodle-sheet'), 380, 344, 17, 42)]
  if (history.includes('egg')) layers.push(await layer(masterPath('egg-overlay'), 310, 250, 52, 82))
  if (history.includes('second-noodle')) layers.push(await layer(masterPath('noodle-sheet'), 338, 304, 40, 52))
  if (history.includes('second-egg')) layers.push(await layer(masterPath('egg-overlay'), 270, 216, 80, 100))

  const placements = {
    'hot-dog': [ingredientPath('hot-dog'), 206, 118, 106, 168],
    orleans: [ingredientPath('orleans-chicken'), 218, 132, 98, 154],
    'turkey-noodle': [ingredientPath('turkey-noodle'), 224, 160, 95, 142],
    tenderloin: [ingredientPath('tenderloin'), 220, 130, 96, 160],
    cheese: [ingredientPath('cheese'), 212, 128, 101, 145],
    corn: [ingredientPath('corn'), 138, 92, 138, 164],
    sauce: [ingredientPath('sauce'), 206, 136, 104, 156],
    scallion: [ingredientPath('scallion'), 118, 78, 148, 160],
  }
  for (const key of Object.keys(placements)) {
    if (!history.includes(key)) continue
    const [file, width, height, left, top] = placements[key]
    layers.push(await layer(file, width, height, left, top))
  }
  return layers
}

async function renderRecipe(recipe, actions) {
  const directory = path.join(stageRoot, recipe)
  await fs.mkdir(directory, { recursive: true })
  const files = []
  const history = []
  for (let index = 0; index < actions.length; index += 1) {
    const action = actions[index]
    if (action !== 'empty') history.push(action)
    const name = `${recipe}-${String(index).padStart(2, '0')}-${stageNames[recipe][index]}.png`
    const output = path.join(directory, name)
    const layers = await cumulativeLayers(recipe, action, history)
    await writeImage((await transparentCanvas()).composite(layers).png({ compressionLevel: 9, adaptiveFiltering: false }), output)
    files.push(output)
  }
  return files
}

async function renderHeatVariant(source, output, state) {
  let image = sharp(source).ensureAlpha()
  if (state === 'raw') image = image.modulate({ brightness: 0.92, saturation: 0.74 })
  if (state === 'ready') image = image.modulate({ brightness: 1.04, saturation: 1.08 })
  if (state === 'burnt') image = image.modulate({ brightness: 0.68, saturation: 1.18, hue: 12 })
  if (state === 'scorched') image = image.modulate({ brightness: 0.40, saturation: 0.36, hue: 18 })
  await writeImage(image.png({ compressionLevel: 9, adaptiveFiltering: false }), output)
}

const heatTargets = {
  classic: [['02-egg', 'classic-02-egg.png'], ['03-hot-dog', 'classic-03-hot-dog.png']],
  'big-eater': [['02-egg', 'big-eater-02-egg.png'], ['04-second-egg', 'big-eater-04-second-egg.png']],
  orleans: [['02-egg', 'orleans-02-egg.png'], ['03-orleans', 'orleans-03-orleans.png']],
  signature: [['02-egg', 'signature-02-egg.png'], ['03-turkey-noodle', 'signature-03-turkey-noodle.png']],
  tenderloin: [['02-egg', 'tenderloin-02-egg.png'], ['03-turkey-noodle', 'tenderloin-03-turkey-noodle.png'], ['04-tenderloin', 'tenderloin-04-tenderloin.png']],
}

async function buildAtlas(recipe, frames) {
  const columns = frames.length <= 9 ? 3 : 4
  const rows = Math.ceil(frames.length / columns)
  const gap = 6
  const cell = 330
  const canvas = sharp({
    create: {
      width: columns * cell + (columns - 1) * gap,
      height: rows * cell + (rows - 1) * gap,
      channels: 3,
      background: '#142033',
    },
  })
  const composites = []
  for (let index = 0; index < frames.length; index += 1) {
    composites.push({
      input: await fit(frames[index], cell, cell),
      left: (index % columns) * (cell + gap),
      top: Math.floor(index / columns) * (cell + gap),
    })
  }
  await writeImage(canvas.composite(composites).png({ compressionLevel: 9, adaptiveFiltering: false }), path.join(stageRoot, `${recipe}-stage-atlas.png`))
}

const cumulativeFiles = []
for (const [recipe, actions] of Object.entries(recipes)) {
  const files = await renderRecipe(recipe, actions)
  cumulativeFiles.push(...files)
  await buildAtlas(recipe, files)
}

for (const [recipe, targets] of Object.entries(heatTargets)) {
  for (const [prefix, sourceName] of targets) {
    const source = path.join(stageRoot, recipe, sourceName)
    for (const state of ['raw', 'ready', 'burnt', 'scorched']) {
      await renderHeatVariant(source, path.join(stageRoot, 'heat', recipe, `${prefix}-${state}.png`), state)
    }
  }
}

const modifierRoot = path.join(stageRoot, 'modifiers')
const toppingMap = {
  bacon: 'bacon', 'chili-powder': 'chili-powder', cilantro: 'cilantro',
  egg: 'egg', enoki: 'enoki', onion: 'onion',
}
for (const [name, ingredient] of Object.entries(toppingMap)) {
  const output = path.join(modifierRoot, 'toppings', `topping-${name}.png`)
  await writeImage((await transparentCanvas()).composite([await layer(ingredientPath(ingredient), 290, 250, 62, 82)]).png({ compressionLevel: 9 }), output)
}

for (const recipe of Object.keys(recipes)) {
  for (const action of ['cut', 'roll']) {
    const output = path.join(modifierRoot, 'no-scallion', `${recipe}-${action}.png`)
    const layers = await cumulativeLayers(recipe, action, [action])
    await writeImage((await transparentCanvas()).composite(layers).png({ compressionLevel: 9, adaptiveFiltering: false }), output)
  }
}

await writeStageContactSheet(cumulativeFiles)

process.stdout.write(`Built ${cumulativeFiles.length} cumulative stage assets plus heat, modifiers and atlases.\n`)
