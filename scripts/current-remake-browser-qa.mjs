import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'artifacts', 'current-remake', 'flow')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})

const result = { checkpoints: [], consoleErrors: [] }

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(message.text()) })
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
  })
  await page.goto('http://127.0.0.1:60876/', { waitUntil: 'networkidle' })
  await page.locator('.home-screen__art').waitFor()
  if (await page.locator('.home-hotspot').count() !== 5) throw new Error('Start menu does not expose five hotspots')
  await page.locator('.home-hotspot--start').click()
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 5_000 })

  async function drag(from, to) {
    const source = await page.locator(from).boundingBox()
    const target = await page.locator(to).boundingBox()
    if (!source || !target) throw new Error(`Missing drag target: ${from} -> ${to}`)
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
    await page.mouse.down()
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
    await page.mouse.up()
  }

  async function stroke(selector, from, to) {
    const box = await page.locator(selector).boundingBox()
    if (!box) throw new Error(`Missing gesture target: ${selector}`)
    await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 6 })
    await page.mouse.up()
  }

  async function checkpoint(name, expectedStep) {
    await page.waitForFunction((step) => document.querySelector('[data-slot-id="left"]')?.dataset.expectedStepId === step, expectedStep)
    const state = await page.locator('[data-slot-id="left"]').evaluate((slot) => ({
      expected: slot.dataset.expectedStepId,
      stageCount: slot.querySelectorAll('.griddle-slot__stage-art').length,
      allFoodImages: slot.querySelectorAll('.griddle-slot__food img').length,
      overlayCount: slot.querySelectorAll('[data-modifier-overlay]').length,
      stageSrc: slot.querySelector('.griddle-slot__stage-art')?.getAttribute('src') ?? '',
    }))
    if (state.stageCount !== 1 || state.allFoodImages !== 1 || state.overlayCount !== 0) {
      throw new Error(`Invalid stage rendering at ${name}: ${JSON.stringify(state)}`)
    }
    result.checkpoints.push({ name, ...state })
  }

  await drag('[data-ingredient-id="noodle"]', '[data-slot-id="left"]')
  await checkpoint('noodle', 'egg')
  await drag('[data-ingredient-id="egg"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="wait-egg"]').waitFor()
  await page.locator('[data-tutorial-step="hot-dog"]').waitFor({ timeout: 8_000 })
  await checkpoint('egg', 'hot-dog')
  await page.screenshot({ path: path.join(outputDir, '01-integrated-egg.png') })

  await drag('[data-ingredient-id="hot-dog"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="sauce"]').waitFor({ timeout: 8_000 })
  await checkpoint('hot-dog', 'sauce')

  await page.locator('[data-sauce-brush]').click()
  await stroke('[data-gesture-slot-id="left"]', [0.16, 0.45], [0.72, 0.48])
  await stroke('[data-gesture-slot-id="left"]', [0.76, 0.58], [0.2, 0.55])
  await checkpoint('sauce-two-strokes', 'scallion')

  await drag('[data-ingredient-id="scallion"]', '[data-slot-id="left"]')
  await checkpoint('scallion', 'cut')
  for (const ratio of [0.3, 0.5, 0.7]) await stroke('[data-gesture-slot-id="left"]', [0.15, ratio], [0.85, ratio])
  await checkpoint('three-cuts', 'roll')

  await stroke('[data-gesture-slot-id="left"]', [0.2, 0.52], [0.52, 0.5])
  await page.locator('[data-tutorial-step="pack"]').waitFor()
  const rolled = await page.locator('[data-slot-id="left"]').evaluate((slot) => ({
    phase: [...slot.classList].find((name) => name.startsWith('phase-')),
    imageCount: slot.querySelectorAll('.griddle-slot__food img').length,
    stageSrc: slot.querySelector('.griddle-slot__stage-art')?.getAttribute('src') ?? '',
  }))
  if (rolled.phase !== 'phase-rolled' || rolled.imageCount !== 1) throw new Error(`One right swipe did not roll: ${JSON.stringify(rolled)}`)
  result.checkpoints.push({ name: 'one-short-right-swipe', ...rolled })
  await page.screenshot({ path: path.join(outputDir, '02-one-swipe-rolled.png') })

  await page.locator('[data-slot-id="left"] .griddle-slot__food').click()
  await page.locator('[data-tray-slot-id="left"]').waitFor()
  await drag('[data-tray-slot-id="left"]', '[data-customer-id].presence-active')
  await page.waitForFunction(() => document.querySelector('.game-screen')?.dataset.kitchenTutorialMode === 'complete')
  result.tutorialComplete = true
  result.vesselCount = await page.locator('.table-ingredient__vessel').count()
  result.ingredientCount = await page.locator('[data-ingredient-id]').count()
  if (result.vesselCount !== result.ingredientCount) throw new Error('Not every ingredient is grounded in a vessel')
  await page.screenshot({ path: path.join(outputDir, '03-delivered.png') })
  await writeFile(path.join(outputDir, 'result.json'), JSON.stringify(result, null, 2))
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} finally {
  await browser.close()
}
