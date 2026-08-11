import path from 'node:path'
import { buildContactSheet } from './build-contact-sheet.mjs'

const root = process.cwd()
const menuRoot = path.join(root, 'src', 'assets', 'approved', 'menu')

const dishNames = [
  'dish-classic-noodle.png',
  'dish-big-eater-noodle.png',
  'dish-orleans-chicken-noodle.png',
  'dish-signature-cheese-turkey-noodle.png',
  'dish-tenderloin-turkey-noodle.png',
]
const ingredientNames = [
  'ingredient-bacon.png', 'ingredient-cheese.png', 'ingredient-chili-powder.png',
  'ingredient-cilantro.png', 'ingredient-corn.png', 'ingredient-egg.png',
  'ingredient-enoki.png', 'ingredient-ham-sausage.png', 'ingredient-hot-dog.png',
  'ingredient-noodle-sheet.png', 'ingredient-onion.png', 'ingredient-orleans-chicken.png',
  'ingredient-pork-floss.png', 'ingredient-sauce.png', 'ingredient-scallion.png',
  'ingredient-spicy-strip.png', 'ingredient-tenderloin.png', 'ingredient-turkey-noodle.png',
]

const items = [
  ...dishNames.map((name) => ({ path: path.join(menuRoot, 'dishes', name) })),
  ...ingredientNames.map((name) => ({ path: path.join(menuRoot, 'ingredients', name) })),
  { path: path.join(menuRoot, 'takeaway-bag.png') },
]

const output = path.join(root, 'artifacts', 'reference-remake', 'review', 'food-contact-sheet.png')
await buildContactSheet(items, output, {
  columns: 6,
  cellWidth: 300,
  cellHeight: 260,
  background: '#142033',
})
process.stdout.write(`${output}\n`)
