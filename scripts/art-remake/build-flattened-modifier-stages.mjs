import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const stageRoot = path.join(root, 'src', 'assets', 'approved', 'stages')
const toppingRoot = path.join(stageRoot, 'modifiers', 'toppings')
const outputRoot = path.join(stageRoot, 'flattened')

const recipes = {
  classic: ['empty', 'noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  'big-eater': ['empty', 'noodle', 'egg', 'second-noodle', 'second-egg', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  orleans: ['empty', 'noodle', 'egg', 'orleans', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  tenderloin: ['empty', 'noodle', 'egg', 'turkey-noodle', 'tenderloin', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
  signature: ['empty', 'noodle', 'egg', 'turkey-noodle', 'cheese', 'corn', 'sauce', 'scallion', 'cut', 'roll', 'pack'],
}

const toppings = ['cilantro', 'onion', 'chili-powder', 'bacon', 'enoki']

async function flatten(basePath, topping, outputPath) {
  const width = 512
  const height = 512
  const base = await sharp(basePath)
    .resize(width, height, { fit: 'contain' })
    .png()
    .toBuffer()
  const overlay = await sharp(path.join(toppingRoot, `topping-${topping}.png`))
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer()
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await sharp(base)
    .composite([{ input: overlay }])
    .png({ compressionLevel: 9, palette: false, adaptiveFiltering: false })
    .toFile(outputPath)
}

for (const [recipe, stages] of Object.entries(recipes)) {
  const sauceIndex = stages.indexOf('sauce')
  const rollIndex = stages.indexOf('roll')
  for (const topping of toppings) {
    for (let index = sauceIndex - 1; index <= rollIndex; index += 1) {
      const prefix = `${recipe}-${String(index).padStart(2, '0')}-${stages[index]}`
      await flatten(
        path.join(stageRoot, recipe, `${prefix}.png`),
        topping,
        path.join(outputRoot, recipe, `${prefix}--${topping}.png`),
      )
    }
  }
}

for (let index = 2; index <= recipes.signature.indexOf('roll'); index += 1) {
  const stage = recipes.signature[index]
  const prefix = `signature-${String(index).padStart(2, '0')}-${stage}`
  await flatten(
    path.join(stageRoot, 'signature', `${prefix}.png`),
    'egg',
    path.join(outputRoot, 'signature', `${prefix}--egg.png`),
  )
}

for (const recipe of Object.keys(recipes)) {
  for (const topping of ['enoki', 'chili-powder']) {
    for (const action of ['cut', 'roll']) {
      await flatten(
        path.join(stageRoot, 'modifiers', 'no-scallion', `${recipe}-${action}.png`),
        topping,
        path.join(outputRoot, recipe, `no-scallion-${recipe}-${action}--${topping}.png`),
      )
    }
  }
}

console.log(JSON.stringify({ outputRoot, recipes: Object.keys(recipes).length, toppings: 6 }))
