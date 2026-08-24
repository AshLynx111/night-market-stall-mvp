import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const previewPort = 4186
const fixturePort = 4187
const previewUrl = `http://127.0.0.1:${previewPort}`
const fixtureUrl = `http://127.0.0.1:${fixturePort}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-final')
await mkdir(outputDir, { recursive: true })

const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

function startServer(args) {
  const processHandle = spawn(process.execPath, [viteEntry, ...args], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  processHandle.stdout.on('data', (chunk) => { log += chunk.toString() })
  processHandle.stderr.on('data', (chunk) => { log += chunk.toString() })
  return { processHandle, log: () => log }
}

async function waitForServer(url, server) {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Vite did not start at ${url}:\n${server.log()}`)
}

const previewServer = startServer(['preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'])
const fixtureServer = startServer(['--host', '127.0.0.1', '--port', String(fixturePort), '--strictPort'])
await Promise.all([
  waitForServer(previewUrl, previewServer),
  waitForServer(fixtureUrl, fixtureServer),
])

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})

const results = {
  capturedAt: new Date().toISOString(),
  browser: 'Microsoft Edge via Playwright Chromium',
  productionBaseUrl: previewUrl,
  developmentFixtureBaseUrl: fixtureUrl,
  fixtureScenarios: ['low patience still frame', 'summary-to-Day-2 setup'],
  screenshots: [],
  flowChecks: {},
  consoleErrors: [],
}

function settledSave(highestDay) {
  const bestStars = {}
  for (let day = 1; day < highestDay; day += 1) bestStars[day] = 3
  return { coins: 2360, fireLevel: 0, signLevel: 0, bestStars, maxUnlockedDay: highestDay }
}

async function openPage({
  scenario,
  baseUrl = previewUrl,
  route = '/',
  viewport = { width: 1440, height: 810 },
  hasTouch = false,
  tutorialComplete = true,
  save = null,
}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch })
  await context.addInitScript(({ complete, campaignSave }) => {
    if (campaignSave) localStorage.setItem('night-market-campaign-v1', JSON.stringify(campaignSave))
    else localStorage.removeItem('night-market-campaign-v1')
    if (complete) localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    else localStorage.removeItem('night-market-guided-tutorial-v2')
    localStorage.removeItem('night-market-audio-settings-v1')
  }, { complete: tutorialComplete, campaignSave: save })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push({ scenario, text: message.text() })
  })
  page.on('pageerror', (error) => results.consoleErrors.push({ scenario, text: error.message }))
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  return { context, page }
}

async function waitForImages(page) {
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 120_000 },
  )
}

async function waitForActive(page, count = 1) {
  await page.waitForFunction(
    (expected) => document.querySelectorAll('[data-customer-id].presence-active').length >= expected,
    count,
    { timeout: 20_000 },
  )
}

async function capture(page, filename, state, environment = 'production preview') {
  await waitForImages(page)
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, viewport: page.viewportSize(), state, environment })
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

async function openProductionDay(day) {
  const opened = await openPage({
    scenario: `production Day ${day}`,
    save: settledSave(day),
  })
  await opened.page.locator('[data-ui-screen="home"]').waitFor()
  await opened.page.getByRole('button', { name: '查看关卡与成就' }).click()
  await opened.page.locator('[data-ui-screen="select"]').waitFor()
  await opened.page.getByRole('button', { name: new RegExp(`进入第 ${day} 天`) }).click()
  await opened.page.locator(`[data-ui-screen="playing"][data-day="${day}"]`).waitFor({ timeout: 120_000 })
  await waitForImages(opened.page)
  return opened
}

function inside(inner, outer, tolerance = 1) {
  return inner && outer
    && inner.left >= outer.left - tolerance
    && inner.right <= outer.right + tolerance
    && inner.top >= outer.top - tolerance
    && inner.bottom <= outer.bottom + tolerance
}

try {
  {
    const { context, page } = await openPage({
      scenario: 'production guided Day 1',
      tutorialComplete: false,
    })
    await page.locator('[data-ui-screen="home"]').waitFor()
    await page.getByRole('button', { name: '开始游戏' }).click()
    await page.locator('[data-ui-screen="playing"][data-day="1"]').waitFor({ timeout: 120_000 })
    await page.locator('[data-tutorial-step="noodle"]').waitFor()
    await capture(page, 'day1-initial-1440x810.png', 'guided Day 1 initial state')
    await waitForActive(page)
    await capture(page, 'first-customer-1440x810.png', 'first active customer and visual order')

    await page.getByRole('button', { name: '关闭音乐' }).click()
    await page.getByRole('button', { name: '开启音乐' }).waitFor()
    await page.getByRole('button', { name: '开启音乐' }).click()
    await page.getByRole('button', { name: '暂停并打开菜单' }).click()
    const pauseDialog = page.getByRole('dialog', { name: '完整菜单' })
    await pauseDialog.waitFor()
    await pauseDialog.locator('.modal-close').click()

    await page.locator('[data-ingredient-id="noodle"]').click()
    await page.locator('[data-tutorial-step="egg"]').waitFor()
    await capture(page, 'cooking-1440x810.png', 'guided noodle placement on the left griddle')
    await page.locator('[data-ingredient-id="egg"]').click()
    await page.locator('[data-tutorial-step="hot-dog"]').waitFor({ timeout: 12_000 })
    await page.locator('[data-ingredient-id="hot-dog"]').click()
    await page.locator('[data-tutorial-step="sauce"]').waitFor({ timeout: 12_000 })
    await page.locator('[data-ingredient-id="sauce"]').click()
    await stroke(page, '[data-gesture-slot-id="left"]', [.18, .44], [.76, .48])
    await stroke(page, '[data-gesture-slot-id="left"]', [.78, .58], [.2, .55])
    await page.locator('[data-tutorial-step="scallion"]').waitFor()
    await page.locator('[data-ingredient-id="scallion"]').click()
    await page.locator('[data-tutorial-step="cut"]').waitFor()
    for (const y of [.3, .5, .7]) await stroke(page, '[data-gesture-slot-id="left"]', [.15, y], [.85, y])
    await page.locator('[data-tutorial-step="roll"]').waitFor()
    await stroke(page, '[data-gesture-slot-id="left"]', [.18, .52], [.72, .5])
    await page.locator('[data-tutorial-step="pack"]').waitFor()
    await page.locator('[data-slot-id="left"] .griddle-slot__food').click()
    await page.locator('[data-tray-slot-id="left"]').click()
    await page.locator('[data-delivery-feedback]').waitFor()
    await page.waitForFunction(() => document.querySelector('.game-screen')?.dataset.kitchenTutorialMode === 'complete')
    await capture(page, 'delivery-feedback-1440x810.png', 'non-blocking income and quality feedback')

    const progress = page.getByRole('progressbar', { name: /已完成订单/ })
    results.flowChecks.guidedOrder = {
      completedOrders: Number(await progress.getAttribute('aria-valuenow')),
      tutorialCompleted: await page.evaluate(() => localStorage.getItem('night-market-guided-tutorial-v2') === 'true'),
      savedCoins: await page.evaluate(() => JSON.parse(localStorage.getItem('night-market-campaign-v1') ?? '{}').coins),
      pauseOpenedAndClosed: await pauseDialog.count() === 0,
      musicToggledOffAndOn: await page.getByRole('button', { name: '关闭音乐' }).count() === 1,
    }
    await context.close()
  }

  {
    const { context, page } = await openProductionDay(3)
    await waitForActive(page, 2)
    results.flowChecks.multipleCustomers = await page.locator('[data-customer-id].presence-active').count()
    await capture(page, 'two-customers-1440x810.png', 'two simultaneous active customers and separate bubbles')
    await drag(page, '[data-ingredient-id="noodle"]', '[data-slot-id="left"]')
    await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
    await drag(page, '[data-ingredient-id="noodle"]', '[data-slot-id="right"]')
    await page.locator('[data-slot-id="right"][data-stage-step="noodle"]').waitFor()
    results.flowChecks.bothGriddles = {
      leftOccupied: await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').count() === 1,
      rightOccupied: await page.locator('[data-slot-id="right"][data-stage-step="noodle"]').count() === 1,
    }
    await capture(page, 'two-griddles-1440x810.png', 'left and right griddles simultaneously occupied')
    await context.close()
  }

  {
    const { context, page } = await openProductionDay(5)
    await waitForActive(page, 2)
    await page.locator('[data-kitchen-expanded-rack-overlay]').waitFor()
    results.flowChecks.expandedRack = {
      overlayPresent: await page.locator('[data-kitchen-expanded-rack-overlay]').count() === 1,
      ingredientCount: await page.locator('[data-ingredient-id]').count(),
    }
    await capture(page, 'expanded-rack-1440x810.png', 'Day 5 expanded 3×5 ingredient rack')
    await context.close()
  }

  {
    const { context, page } = await openPage({
      scenario: 'development low-patience fixture',
      baseUrl: fixtureUrl,
      route: '/?playDay=3&qaPatienceRatio=0.12',
    })
    await page.locator('[data-ui-screen="playing"]').waitFor()
    await waitForActive(page)
    await page.locator('[data-critical-customer="true"]').waitFor()
    results.flowChecks.criticalPatience = {
      markerPresent: await page.locator('[data-critical-customer="true"]').count() >= 1,
      criticalBarPresent: await page.locator('[data-patience-level="critical"]').count() >= 1,
    }
    await capture(page, 'low-patience-1440x810.png', 'critical customer patience presentation', 'development fixture')
    await context.close()
  }

  {
    const summarySave = { coins: 45, fireLevel: 0, signLevel: 0, bestStars: { 1: 3 }, maxUnlockedDay: 2 }
    const { context, page } = await openPage({
      scenario: 'development summary fixture',
      baseUrl: fixtureUrl,
      route: '/?playDay=1&qaScreen=summary',
      save: summarySave,
    })
    await page.locator('[data-ui-screen="summary"]').waitFor()
    await page.getByRole('button', { name: '进入下一天' }).click()
    await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor()
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('night-market-campaign-v1') ?? '{}'))
    results.flowChecks.nextDayAndSave = {
      enteredDay2: await page.locator('[data-day="2"]').count() === 1,
      day1StarsPreserved: persisted.bestStars?.['1'] === 3,
      unlockedDayPreserved: persisted.maxUnlockedDay >= 2,
      coinsPreserved: persisted.coins === 45,
    }
    await context.close()
  }

  {
    const viewport = { width: 844, height: 390 }
    const { context, page } = await openPage({
      scenario: 'production mobile landscape',
      viewport,
      hasTouch: true,
      tutorialComplete: false,
    })
    await page.getByRole('button', { name: '开始游戏' }).tap()
    await page.locator('[data-ui-screen="playing"]').waitFor()
    await page.locator('[data-tutorial-step="noodle"]').waitFor()
    await page.locator('[data-ingredient-id="noodle"]').tap()
    await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
    await page.getByRole('button', { name: '暂停并打开菜单' }).tap()
    const dialog = page.getByRole('dialog', { name: '完整菜单' })
    await dialog.waitFor()
    const bounds = await page.evaluate(() => {
      const serialize = (rect) => rect ? ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }) : null
      return {
        viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight },
        logical: serialize(document.querySelector('.game-screen__logical')?.getBoundingClientRect()),
        dialog: serialize(document.querySelector('[role="dialog"]')?.getBoundingClientRect()),
      }
    })
    results.flowChecks.mobileLandscape = {
      touchPlacementCompleted: await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').count() === 1,
      pauseOpened: await dialog.count() === 1,
      logicalInsideViewport: inside(bounds.logical, bounds.viewport),
      dialogInsideViewport: inside(bounds.dialog, bounds.viewport),
    }
    await dialog.locator('.modal-close').tap()
    await capture(page, 'mobile-landscape-844x390.png', 'touch placement in mobile landscape')
    await context.close()
  }

  results.flowChecks.allImagesDecoded = true
  const guided = results.flowChecks.guidedOrder
  const both = results.flowChecks.bothGriddles
  const rack = results.flowChecks.expandedRack
  const patience = results.flowChecks.criticalPatience
  const nextDay = results.flowChecks.nextDayAndSave
  const mobile = results.flowChecks.mobileLandscape
  const passed = guided.completedOrders === 1
    && guided.tutorialCompleted
    && guided.savedCoins === 46
    && guided.pauseOpenedAndClosed
    && guided.musicToggledOffAndOn
    && results.flowChecks.multipleCustomers >= 2
    && both.leftOccupied && both.rightOccupied
    && rack.overlayPresent && rack.ingredientCount === 15
    && patience.markerPresent && patience.criticalBarPresent
    && Object.values(nextDay).every(Boolean)
    && Object.values(mobile).every(Boolean)
    && results.screenshots.length === 9
    && results.consoleErrors.length === 0
  results.passed = passed

  if (!passed) throw new Error(`Final gameplay UI acceptance failed: ${JSON.stringify(results, null, 2)}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  previewServer.processHandle.kill()
  fixtureServer.processHandle.kill()
}
