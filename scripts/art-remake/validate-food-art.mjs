import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const menuRoot = path.join(root, 'src', 'assets', 'approved', 'menu')

const dishes = [
  'dish-classic-noodle.png',
  'dish-big-eater-noodle.png',
  'dish-orleans-chicken-noodle.png',
  'dish-signature-cheese-turkey-noodle.png',
  'dish-tenderloin-turkey-noodle.png',
]

const ingredients = [
  'ingredient-bacon.png',
  'ingredient-cheese.png',
  'ingredient-chili-powder.png',
  'ingredient-cilantro.png',
  'ingredient-corn.png',
  'ingredient-egg.png',
  'ingredient-enoki.png',
  'ingredient-ham-sausage.png',
  'ingredient-hot-dog.png',
  'ingredient-noodle-sheet.png',
  'ingredient-onion.png',
  'ingredient-orleans-chicken.png',
  'ingredient-pork-floss.png',
  'ingredient-sauce.png',
  'ingredient-scallion.png',
  'ingredient-spicy-strip.png',
  'ingredient-tenderloin.png',
  'ingredient-turkey-noodle.png',
]

const packaging = ['takeaway-bag.png']

async function assertTransparentCorners(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const cornerIndexes = [
    0,
    (info.width - 1) * info.channels,
    (info.height - 1) * info.width * info.channels,
    ((info.height * info.width) - 1) * info.channels,
  ]

  if (cornerIndexes.some((index) => data[index + 3] !== 0)) {
    throw new Error(`Opaque corner detected in ${path.relative(root, file)}`)
  }
}

const dishFiles = dishes.map((name) => path.join(menuRoot, 'dishes', name))
const ingredientFiles = ingredients.map((name) => path.join(menuRoot, 'ingredients', name))
const packagingFiles = packaging.map((name) => path.join(menuRoot, name))

await Promise.all([...dishFiles, ...ingredientFiles, ...packagingFiles].map((file) => fs.access(file)))
await Promise.all([...dishFiles, ...ingredientFiles, ...packagingFiles].map(assertTransparentCorners))

const menuSvg = await fs.readFile(path.join(menuRoot, 'menu-board.svg'), 'utf8')
const requiredMenuCopy = [
  '招牌芝士火鸡烤冷面', '￥16元',
  '经典款烤冷面', '￥7元',
  '大胃王烤冷面', '￥10元',
  '奥尔良鸡排烤冷面',
  '里脊肉火鸡烤冷面', '￥14元',
  '鸡蛋', '热狗', '辣条', '培根', '火腿肠', '鸡排', '里脊肉', '肉松', '火鸡面',
]
const missingCopy = requiredMenuCopy.filter((copy) => !menuSvg.includes(copy))
if (missingCopy.length > 0) {
  throw new Error(`Menu copy missing: ${missingCopy.join(', ')}`)
}

const result = {
  dishes,
  ingredients,
  packaging,
  menuCopyVerified: true,
  transparentCornersVerified: true,
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(result)}\n`)
} else {
  process.stdout.write(`Validated ${dishes.length} dishes, ${ingredients.length} ingredients and ${packaging.length} packaging asset.\n`)
}
