import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4182
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v4')
await mkdir(outputDir, { recursive: true })

const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Vite did not start:\n${serverLog}`)
}

await waitForServer()
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})
const results = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 844, height: 390 },
  screenshots: [],
  touchChecks: {},
  consoleErrors: [],
}

async function capture(page, filename, state) {
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, state })
}

async function stroke(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`Missing gesture target: ${selector}`)
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}

try {
  const page = await browser.newPage({
    viewport: results.viewport,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  })
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
  })
  await page.goto(`${baseUrl}/?playDay=1`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="playing"]').waitFor({ timeout: 120_000 })
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 120_000 })
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 12_000 })

  const noodle = page.locator('[data-ingredient-id="noodle"]')
  await noodle.tap()
  await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
  await page.locator('[data-tutorial-step="egg"]').waitFor()
  results.touchChecks.afterNoodleTap = {
    occupiedSlots: await page.locator('[data-stage-step="noodle"]').count(),
    label: await noodle.getAttribute('aria-label'),
  }
  await capture(page, 'tap-cooking-844x390.png', 'noodle placed with one touchscreen tap')

  await page.locator('[data-ingredient-id="egg"]').tap()
  await page.locator('[data-tutorial-step="hot-dog"]').waitFor({ timeout: 12_000 })
  await page.locator('[data-ingredient-id="hot-dog"]').tap()
  await page.locator('[data-tutorial-step="sauce"]').waitFor({ timeout: 12_000 })
  await page.locator('[data-ingredient-id="sauce"]').tap()
  await stroke(page, '[data-gesture-slot-id="left"]', [.18, .44], [.76, .48])
  await stroke(page, '[data-gesture-slot-id="left"]', [.78, .58], [.2, .55])
  await page.locator('[data-tutorial-step="scallion"]').waitFor()
  await page.locator('[data-ingredient-id="scallion"]').tap()
  await page.locator('[data-tutorial-step="cut"]').waitFor()
  for (const y of [.3, .5, .7]) await stroke(page, '[data-gesture-slot-id="left"]', [.15, y], [.85, y])
  await page.locator('[data-tutorial-step="roll"]').waitFor()
  await stroke(page, '[data-gesture-slot-id="left"]', [.18, .52], [.72, .5])
  await page.locator('[data-tutorial-step="pack"]').waitFor()
  await page.locator('[data-slot-id="left"] .griddle-slot__food').tap()

  const trayDish = page.locator('[data-tray-slot-id="left"]')
  await trayDish.waitFor()
  results.touchChecks.trayLabel = await trayDish.getAttribute('aria-label')
  await capture(page, 'tap-ready-to-deliver-844x390.png', 'packed dish ready for tap delivery')
  await trayDish.tap()
  await page.locator('[data-delivery-feedback]').waitFor()
  await page.waitForFunction(() => document.querySelector('.game-screen')?.dataset.kitchenTutorialMode === 'complete')
  await capture(page, 'tap-delivery-feedback-844x390.png', 'dish delivered with one touchscreen tap')

  const progress = page.getByRole('progressbar', { name: /已完成订单/ })
  results.touchChecks.delivery = {
    completedOrders: Number(await progress.getAttribute('aria-valuenow')),
    tutorialCompleted: await page.evaluate(() => localStorage.getItem('night-market-guided-tutorial-v2') === 'true'),
    trayDishRemoved: await page.locator('[data-tray-slot-id="left"]').count() === 0,
    coins: await page.evaluate(() => JSON.parse(localStorage.getItem('night-market-campaign-v1') ?? '{}').coins),
  }

  if (results.touchChecks.afterNoodleTap.occupiedSlots !== 1) throw new Error('Noodle tap applied more than once')
  if (results.touchChecks.delivery.completedOrders !== 1) throw new Error('Dish tap did not deliver exactly one order')
  if (!results.touchChecks.delivery.tutorialCompleted || !results.touchChecks.delivery.trayDishRemoved) {
    throw new Error('Touch flow did not complete cleanly')
  }
  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)

  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
  await page.close()
} finally {
  await browser.close()
  server.kill()
}
