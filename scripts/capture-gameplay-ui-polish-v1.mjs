import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4179
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v1')
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
      const response = await fetch(baseUrl)
      if (response.ok) return
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

const results = { capturedAt: new Date().toISOString(), baseUrl, screenshots: [], consoleErrors: [] }

async function openGame(query, viewport = { width: 1440, height: 810 }, tutorialComplete = true) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  await page.addInitScript(({ complete }) => {
    localStorage.removeItem('night-market-campaign-v1')
    if (complete) localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    else localStorage.removeItem('night-market-guided-tutorial-v2')
  }, { complete: tutorialComplete })
  await page.goto(`${baseUrl}/${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator('[data-screen-art="kitchen"]').waitFor({ timeout: 60_000 })
  await page.waitForFunction(() => [...document.images].filter((image) => image.closest('[data-screen-art="kitchen"]')).every((image) => image.complete), null, { timeout: 60_000 })
  return page
}

async function capture(page, filename, checks = {}) {
  await page.waitForTimeout(180)
  const target = path.join(outputDir, filename)
  await page.screenshot({ path: target })
  results.screenshots.push({ filename, viewport: page.viewportSize(), ...checks })
}

async function waitForActive(page, count = 1) {
  await page.waitForFunction((expected) => document.querySelectorAll('[data-customer-id].presence-active').length >= expected, count, { timeout: 12_000 })
}

async function drag(page, from, to) {
  const source = await page.locator(from).boundingBox()
  const target = await page.locator(to).boundingBox()
  if (!source || !target) throw new Error(`Missing drag target: ${from} -> ${to}`)
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await page.mouse.up()
}

try {
  let page = await openGame('?playDay=1', { width: 1440, height: 810 }, false)
  await capture(page, 'day1-initial-1440x810.png', { state: 'guided initial' })
  await waitForActive(page)
  await capture(page, 'first-customer-1440x810.png', { state: 'first active customer' })
  await page.close()

  page = await openGame('?playDay=3')
  await waitForActive(page, 1)
  await drag(page, '[data-ingredient-id="noodle"]', '[data-slot-id="left"]')
  await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
  await capture(page, 'cooking-1440x810.png', { state: 'noodle on left griddle' })
  await waitForActive(page, 2)
  await capture(page, 'two-customers-1440x810.png', { state: 'two active customers' })
  await drag(page, '[data-ingredient-id="noodle"]', '[data-slot-id="right"]')
  await page.locator('[data-slot-id="right"][data-stage-step="noodle"]').waitFor()
  await capture(page, 'two-griddles-1440x810.png', { state: 'both griddles occupied' })
  await page.close()

  page = await openGame('?playDay=5')
  await waitForActive(page, 2)
  await page.locator('[data-kitchen-expanded-rack-overlay]').waitFor()
  await capture(page, 'expanded-rack-1440x810.png', { state: 'Day 5 expanded rack' })
  await page.close()

  page = await openGame('?playDay=3&qaDeliveryFeedback=1')
  await waitForActive(page)
  await page.locator('[data-delivery-feedback]').waitFor()
  await capture(page, 'delivery-feedback-1440x810.png', { state: 'delivery reward fixture' })
  await page.close()

  page = await openGame('?playDay=3&qaPatienceRatio=0.12')
  await waitForActive(page)
  await page.locator('[data-critical-customer="true"]').waitFor()
  await capture(page, 'low-patience-1440x810.png', { state: 'critical patience fixture' })
  await page.close()

  page = await openGame('?playDay=3', { width: 844, height: 390 })
  await waitForActive(page, 2)
  await capture(page, 'mobile-landscape-844x390.png', { state: 'mobile landscape' })
  await page.close()

  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
