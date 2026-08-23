import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4180
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v2')
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
const results = { capturedAt: new Date().toISOString(), baseUrl, screenshots: [], flowChecks: {}, consoleErrors: [] }

async function openGame(query = '', {
  viewport = { width: 1440, height: 810 },
  selector = '[data-ui-screen]',
  save = null,
} = {}) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  await page.addInitScript((campaignSave) => {
    if (campaignSave) localStorage.setItem('night-market-campaign-v1', JSON.stringify(campaignSave))
    else localStorage.removeItem('night-market-campaign-v1')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  }, save)
  await page.goto(`${baseUrl}/${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator(selector).waitFor({ timeout: 60_000 })
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 60_000 })
  return page
}

async function capture(page, filename, state) {
  await page.waitForTimeout(320)
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, viewport: page.viewportSize(), state })
}

async function waitForActive(page, count = 1) {
  await page.waitForFunction((expected) => document.querySelectorAll('[data-customer-id].presence-active').length >= expected, count, { timeout: 15_000 })
}

try {
  let page = await openGame()
  await capture(page, 'home-1440x810.png', 'shared home screen presentation')
  await page.getByRole('button', { name: '查看关卡与成就' }).click()
  await page.locator('[data-ui-screen="select"]').waitFor()
  await capture(page, 'day-select-1440x810.png', 'day select with SVG lock states')
  results.flowChecks.homeToSelect = true
  results.flowChecks.lockIconCount = await page.locator('.day-card__lock .game-icon').count()
  await page.close()

  page = await openGame('?playDay=1&qaScreen=summary', {
    selector: '[data-ui-screen="summary"]',
    save: { coins: 96, fireLevel: 1, signLevel: 0, bestStars: { 1: 3 }, maxUnlockedDay: 2 },
  })
  await capture(page, 'summary-1440x810.png', 'shared summary screen presentation')
  await page.getByRole('button', { name: '进入下一天' }).click()
  await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor()
  results.flowChecks.summaryToNextDay = true
  await page.close()

  page = await openGame('?playDay=5', { selector: '[data-ui-screen="playing"]' })
  await waitForActive(page, 2)
  await page.locator('[data-order-density="compact"]').first().waitFor({ timeout: 15_000 })
  await capture(page, 'dense-orders-1440x810.png', 'content-derived compact order bubble')
  results.flowChecks.compactOrderVisible = true
  await page.close()

  page = await openGame('?playDay=3&qaDeliveryFeedback=1&qaPatienceRatio=0.12', {
    viewport: { width: 844, height: 390 },
    selector: '[data-ui-screen="playing"]',
  })
  await waitForActive(page, 2)
  await page.locator('[data-critical-customer="true"]').waitFor()
  await page.locator('[data-delivery-feedback]').waitFor()
  await capture(page, 'mobile-landscape-844x390.png', 'inverse-scaled HUD, critical order and reward')
  const readableTargets = await page.evaluate(() => {
    const labels = ['.gameplay-hud__day', '.gameplay-hud__orders', '.gameplay-hud__coins', '[data-customer-bubble-for]', '[data-delivery-feedback]']
    return Object.fromEntries(labels.map((selector) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect()
      return [selector, rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null]
    }))
  })
  results.flowChecks.mobileReadableTargets = readableTargets
  await page.close()

  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
