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

const results = { capturedAt: new Date().toISOString(), baseUrl, screenshots: [], flowChecks: {}, consoleErrors: [] }

async function openGame(query, viewport = { width: 1440, height: 810 }, tutorialComplete = true, selector = '[data-screen-art="kitchen"]', campaignSave = null) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  await page.addInitScript(({ complete, save }) => {
    if (save) localStorage.setItem('night-market-campaign-v1', JSON.stringify(save))
    else localStorage.removeItem('night-market-campaign-v1')
    if (complete) localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    else localStorage.removeItem('night-market-guided-tutorial-v2')
  }, { complete: tutorialComplete, save: campaignSave })
  await page.goto(`${baseUrl}/${query}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator(selector).waitFor({ timeout: 60_000 })
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 60_000 })
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

async function stroke(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw new Error(`Missing gesture target: ${selector}`)
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}

try {
  let page = await openGame('?playDay=1', { width: 1440, height: 810 }, false)
  await capture(page, 'day1-initial-1440x810.png', { state: 'guided initial' })
  await waitForActive(page)
  await capture(page, 'first-customer-1440x810.png', { state: 'first active customer' })
  await page.locator('[aria-label="关闭音乐"]').click()
  await page.locator('[aria-label="开启音乐"]').waitFor()
  await page.locator('[aria-label="开启音乐"]').click()
  await page.locator('[aria-label="暂停并打开菜单"]').click()
  await page.locator('[role="dialog"][aria-label="完整菜单"]').waitFor()
  await page.locator('[role="dialog"][aria-label="完整菜单"] .modal-close').click()

  await drag(page, '[data-ingredient-id="noodle"]', '[data-slot-id="left"]')
  await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
  await capture(page, 'cooking-1440x810.png', { state: 'actual guided noodle placement' })
  await page.locator('[data-ingredient-id="egg"]').click()
  await page.locator('[data-tutorial-step="hot-dog"]').waitFor({ timeout: 10_000 })
  await drag(page, '[data-ingredient-id="hot-dog"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="sauce"]').waitFor({ timeout: 10_000 })
  await page.locator('[data-ingredient-id="sauce"]').click()
  await stroke(page, '[data-gesture-slot-id="left"]', [.18, .44], [.76, .48])
  await stroke(page, '[data-gesture-slot-id="left"]', [.78, .58], [.2, .55])
  await page.locator('[data-tutorial-step="scallion"]').waitFor()
  await drag(page, '[data-ingredient-id="scallion"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="cut"]').waitFor()
  for (const y of [.3, .5, .7]) await stroke(page, '[data-gesture-slot-id="left"]', [.15, y], [.85, y])
  await page.locator('[data-tutorial-step="roll"]').waitFor()
  await stroke(page, '[data-gesture-slot-id="left"]', [.18, .52], [.72, .5])
  await page.locator('[data-tutorial-step="pack"]').waitFor()
  await page.locator('[data-slot-id="left"] .griddle-slot__food').click()
  await page.locator('[data-tray-slot-id="left"]').waitFor()
  await drag(page, '[data-tray-slot-id="left"]', '[data-customer-id].presence-active')
  await page.locator('[data-delivery-feedback]').waitFor()
  await capture(page, 'delivery-feedback-1440x810.png', { state: 'actual completed order reward' })
  await page.waitForFunction(() => document.querySelector('.game-screen')?.dataset.kitchenTutorialMode === 'complete')
  results.flowChecks = {
    ...results.flowChecks,
    tutorialCompleted: await page.evaluate(() => localStorage.getItem('night-market-guided-tutorial-v2') === 'true'),
    saveCoinsAfterDelivery: await page.evaluate(() => JSON.parse(localStorage.getItem('night-market-campaign-v1') ?? '{}').coins),
    pauseMenuOpened: true,
    musicToggledOffAndOn: true,
  }
  await page.close()

  page = await openGame('?playDay=3')
  await waitForActive(page, 1)
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

  page = await openGame('?playDay=3&qaPatienceRatio=0.12')
  await waitForActive(page)
  await page.locator('[data-critical-customer="true"]').waitFor()
  await capture(page, 'low-patience-1440x810.png', { state: 'critical patience fixture' })
  await page.close()

  page = await openGame('?playDay=3', { width: 844, height: 390 })
  await waitForActive(page, 2)
  await capture(page, 'mobile-landscape-844x390.png', { state: 'mobile landscape' })
  await page.close()

  page = await openGame(
    '?playDay=1&qaScreen=summary',
    { width: 1440, height: 810 },
    true,
    '[data-screen-art="summary"]',
    { coins: 45, fireLevel: 0, signLevel: 0, bestStars: { 1: 3 }, maxUnlockedDay: 2 },
  )
  await page.getByRole('button', { name: '进入下一天' }).click()
  await page.locator('[data-screen-art="kitchen"][data-day="2"]').waitFor()
  results.flowChecks = { ...results.flowChecks, enteredNextDay: true }
  await page.close()

  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
