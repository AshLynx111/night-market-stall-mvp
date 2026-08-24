import { spawn } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4185
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v6')
const budgets = { homeBytes: 800 * 1024, day1TransitionBytes: 3500 * 1024 }
await mkdir(outputDir, { recursive: true })

const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteEntry, 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
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
  throw new Error(`Production preview did not start:\n${serverLog}`)
}

function isCompressible(filename) {
  return /\.(?:css|html|js|json|svg|txt)$/i.test(filename)
}

async function deploymentBytes(url) {
  const parsed = new URL(url)
  const relative = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname)
  const filename = path.join(root, 'dist', relative.replace(/^\//, ''))
  const metadata = await stat(filename)
  if (!isCompressible(filename)) return metadata.size
  return gzipSync(await readFile(filename), { level: 9 }).byteLength
}

async function networkSnapshot(page, includeDocument = false) {
  const entries = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => ({
    url: entry.name,
    initiatorType: entry.initiatorType,
    browserEncodedBytes: entry.encodedBodySize,
    transferBytes: entry.transferSize,
  })))
  const sameOrigin = entries.filter((entry) => entry.url.startsWith(locationOrigin(baseUrl)))
  if (includeDocument) sameOrigin.unshift({
    url: `${baseUrl}/index.html`,
    initiatorType: 'navigation',
    browserEncodedBytes: 0,
    transferBytes: 0,
  })
  const resources = []
  for (const entry of sameOrigin) {
    resources.push({ ...entry, deploymentBytes: await deploymentBytes(entry.url) })
  }
  return {
    bytes: resources.reduce((total, entry) => total + entry.deploymentBytes, 0),
    browserTransferBytes: resources.reduce((total, entry) => total + entry.transferBytes, 0),
    resources,
  }
}

function locationOrigin(url) {
  return new URL(url).origin
}

async function waitForImages(page) {
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 120_000 })
}

async function stroke(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`Missing gesture target: ${selector}`)
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}

await waitForServer()
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})
const results = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 1440, height: 810 },
  budgets,
  screenshots: [],
  network: {},
  flowChecks: {},
  consoleErrors: [],
}

async function capture(page, filename, state) {
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, state })
}

try {
  const context = await browser.newContext({ viewport: results.viewport, deviceScaleFactor: 1, hasTouch: true })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.clearBrowserCache')
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
  })

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="home"]').waitFor({ timeout: 120_000 })
  await waitForImages(page)
  await capture(page, 'optimized-home-1440x810.png', 'cold production home screen')
  results.network.home = await networkSnapshot(page, true)
  await page.evaluate(() => performance.clearResourceTimings())

  await page.getByRole('button', { name: '开始游戏' }).click()
  await page.locator('[data-ui-screen="playing"]').waitFor({ timeout: 120_000 })
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 12_000 })
  await waitForImages(page)
  await capture(page, 'optimized-day1-1440x810.png', 'cold home to guided Day 1 transition')
  results.network.day1Transition = await networkSnapshot(page)

  await page.locator('[data-ingredient-id="noodle"]').tap()
  await page.locator('[data-tutorial-step="egg"]').waitFor()
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
  await page.locator('[data-tray-slot-id="left"]').tap()
  await page.locator('[data-delivery-feedback]').waitFor()
  await page.waitForFunction(() => document.querySelector('.game-screen')?.dataset.kitchenTutorialMode === 'complete')
  await capture(page, 'optimized-first-delivery-1440x810.png', 'first guided order completed with optimized artwork')

  const progress = page.getByRole('progressbar', { name: /已完成订单/ })
  results.flowChecks = {
    homeWithinBudget: results.network.home.bytes <= budgets.homeBytes,
    day1TransitionWithinBudget: results.network.day1Transition.bytes <= budgets.day1TransitionBytes,
    completedOrders: Number(await progress.getAttribute('aria-valuenow')),
    tutorialCompleted: await page.evaluate(() => localStorage.getItem('night-market-guided-tutorial-v2') === 'true'),
    allImagesDecoded: await page.evaluate(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0)),
  }

  if (!results.flowChecks.homeWithinBudget || !results.flowChecks.day1TransitionWithinBudget) {
    throw new Error(`Production loading budget failed: ${JSON.stringify(results.network)}`)
  }
  if (results.flowChecks.completedOrders !== 1 || !results.flowChecks.tutorialCompleted || !results.flowChecks.allImagesDecoded) {
    throw new Error(`Guided order did not complete cleanly: ${JSON.stringify(results.flowChecks)}`)
  }
  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)

  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
  await context.close()
} finally {
  await browser.close()
  server.kill()
}
