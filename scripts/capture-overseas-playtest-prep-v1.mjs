import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4195
const baseUrl = `http://127.0.0.1:${port}`
const buildVersion = '0.1.0-overseas-playtest-v1'
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'overseas-playtest-prep-v1')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const forbiddenFixtureParams = ['playDay', 'qaScreen', 'qaServedOrders', 'qaPatienceRatio', 'qaDeliveryFeedback']

await mkdir(outputDir, { recursive: true })

const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], {
  cwd: root,
  env: { ...process.env, VITE_BUILD_VERSION: buildVersion },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForServer() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Vite did not start:\n${serverLog}`)
}

async function waitForImages(page) {
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 120_000 },
  )
}

function observeErrors(page) {
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  return { consoleErrors, pageErrors }
}

async function openFreshPage(context, query) {
  const params = new URLSearchParams(query)
  for (const name of forbiddenFixtureParams) assert(!params.has(name), `Forbidden QA state parameter: ${name}`)
  const page = await context.newPage()
  const errors = observeErrors(page)
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`${baseUrl}/?${params}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen]').waitFor({ timeout: 120_000 })
  await waitForImages(page)
  return { page, errors }
}

async function selectIngredient(page, ingredientId, inputMode) {
  const control = page.locator(`[data-ingredient-id="${ingredientId}"]`)
  await control.waitFor({ state: 'visible', timeout: 30_000 })
  if (inputMode === 'touch') await control.tap()
  else await control.click()
}

const cdpSessions = new WeakMap()

async function dispatchTouchPath(page, target, points, pointerId) {
  const box = await target.boundingBox()
  assert(box, 'Gesture target has no bounds')
  const absolute = points.map(({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y }))
  let client = cdpSessions.get(page)
  if (!client) {
    client = await page.context().newCDPSession(page)
    cdpSessions.set(page, client)
  }
  const touchPoint = ({ x, y }) => ({ x, y, id: pointerId, radiusX: 1, radiusY: 1, force: 1 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touchPoint(absolute[0])] })
  for (const point of absolute.slice(1)) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [touchPoint(point)] })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function dispatchMousePath(page, target, points) {
  const box = await target.boundingBox()
  assert(box, 'Gesture target has no bounds')
  const absolute = points.map(({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y }))
  await page.mouse.move(absolute[0].x, absolute[0].y)
  await page.mouse.down()
  for (const point of absolute.slice(1)) await page.mouse.move(point.x, point.y, { steps: 5 })
  await page.mouse.up()
}

let touchPointerSequence = 100

async function gesture(page, kind, inputMode, points) {
  const target = page.locator('[data-gesture-slot-id="left"]')
  await target.waitFor({ state: 'visible', timeout: 30_000 })
  assert(await target.getAttribute('aria-label'), `${kind} gesture has no accessible label`)
  if (inputMode === 'touch') await dispatchTouchPath(page, target, points, touchPointerSequence++)
  else await dispatchMousePath(page, target, points)
}

async function waitForStep(page, stepId) {
  await page.locator(`[data-slot-id="left"][data-expected-step-id="${stepId}"]`).waitFor({ timeout: 30_000 })
}

async function isStep(page, stepId) {
  return page.locator(`[data-slot-id="left"][data-expected-step-id="${stepId}"]`).count().then(Boolean)
}

async function completeClassicOrder(page, inputMode) {
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  await selectIngredient(page, 'noodle', inputMode)
  await waitForStep(page, 'egg')
  await selectIngredient(page, 'egg', inputMode)
  await waitForStep(page, 'hot-dog')
  await selectIngredient(page, 'hot-dog', inputMode)
  await waitForStep(page, 'sauce')
  await selectIngredient(page, 'sauce', inputMode)
  const saucePath = [{ x: .18, y: .44 }, { x: .82, y: .44 }, { x: .82, y: .62 }, { x: .18, y: .62 }]
  for (let attempt = 0; attempt < 4 && await isStep(page, 'sauce'); attempt += 1) {
    await gesture(page, 'sauce', inputMode, saucePath)
    await page.waitForTimeout(inputMode === 'touch' ? 150 : 25)
  }
  if (!await isStep(page, 'scallion')) {
    const state = await page.locator('[data-slot-id="left"]').evaluate((element) => ({
      expectedStep: element.getAttribute('data-expected-step-id'),
      stageStep: element.getAttribute('data-stage-step'),
      sauceProgress: document.querySelector('[data-sauce-progress]')?.getAttribute('data-sauce-progress'),
    }))
    throw new Error(`Sauce touch path did not advance: ${JSON.stringify(state)}`)
  }
  await waitForStep(page, 'scallion')
  await selectIngredient(page, 'scallion', inputMode)
  await waitForStep(page, 'cut')
  for (const y of [.3, .5, .7, .3, .5]) {
    if (!await isStep(page, 'cut')) break
    await gesture(page, 'cut', inputMode, [{ x: .15, y }, { x: .5, y }, { x: .85, y }])
    await page.waitForTimeout(inputMode === 'touch' ? 150 : 25)
  }
  await waitForStep(page, 'roll')
  await gesture(page, 'roll', inputMode, [{ x: .1, y: .51 }, { x: .5, y: .5 }, { x: .9, y: .49 }])
  const food = page.locator('[data-slot-id="left"] .griddle-slot__food:not(:disabled)')
  await food.waitFor({ state: 'visible', timeout: 30_000 })
  if (inputMode === 'touch') await food.tap()
  else await food.click()
  const dish = page.locator('[data-tray-slot-id="left"]')
  await dish.waitFor({ state: 'visible', timeout: 30_000 })
  if (inputMode === 'touch') await dish.tap()
  else await dish.click()
  await page.waitForFunction(
    () =>
      document.querySelector('[data-ui-screen="summary"]') !== null ||
      document.querySelector('[data-slot-id="left"][data-stage-step="empty"]') !== null,
    null,
    { timeout: 30_000 },
  )
}

async function diagnostics(page) {
  return page.evaluate(() => ({
    screen: document.querySelector('[data-ui-screen]')?.getAttribute('data-ui-screen'),
    htmlLang: document.documentElement.lang,
    locale: document.documentElement.dataset.locale,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    verticalOverflow: document.documentElement.scrollHeight > innerHeight + 1,
    debugVisible: Boolean(document.querySelector('[data-playtest-debug]')),
    feedbackVisible: Boolean(document.querySelector('.playtest-feedback-link')),
    guidedTutorial: document.querySelector('[data-kitchen-tutorial-mode]')?.getAttribute('data-kitchen-tutorial-mode'),
    tutorialStep: document.querySelector('[data-tutorial-step]')?.getAttribute('data-tutorial-step'),
  }))
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  const { page, errors } = await openFreshPage(context, 'lang=en&playtest=1&pid=qa-desktop')
  await page.screenshot({ path: path.join(outputDir, 'playtest-home-1440x810.png') })
  assert(!await page.locator('[data-playtest-debug]').count(), 'Debug panel polluted ordinary playtest mode')
  await page.getByRole('button', { name: 'Start Game' }).click()
  await page.locator('[data-ui-screen="playing"]').waitFor()
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(outputDir, 'playtest-day1-tutorial-1440x810.png') })
  await completeClassicOrder(page, 'mouse')
  await completeClassicOrder(page, 'mouse')
  await completeClassicOrder(page, 'mouse')
  await page.locator('[data-ui-screen="summary"]').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(outputDir, 'playtest-summary-1440x810.png') })
  assert(!await page.locator('.playtest-feedback-link').count(), 'Feedback appeared without configuration')
  await page.locator('.summary-actions button:last-child').click()
  await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor({ timeout: 30_000 })
  const events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('night-market-playtest-events-v1') ?? '[]'))
  await writeFile(path.join(outputDir, 'example-session.json'), JSON.stringify(events, null, 2))
  const result = { name: 'desktop', errors, diagnostic: await diagnostics(page), eventCount: events.length, events }
  await context.close()
  return result
}

async function runDebug(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  const { page, errors } = await openFreshPage(context, 'lang=en&playtest=1&debug=1&pid=qa-debug')
  await page.locator('[data-playtest-debug]').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(outputDir, 'playtest-debug-1440x810.png') })
  const result = { name: 'debug', errors, diagnostic: await diagnostics(page) }
  await context.close()
  return result
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    screen: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  })
  const { page, errors } = await openFreshPage(context, 'lang=en&playtest=1&pid=qa-mobile')
  await page.getByRole('button', { name: 'Start Game' }).tap()
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 30_000 })
  await completeClassicOrder(page, 'touch')
  await page.screenshot({ path: path.join(outputDir, 'playtest-day1-mobile-844x390.png') })
  const events = await page.evaluate(() => JSON.parse(sessionStorage.getItem('night-market-playtest-events-v1') ?? '[]'))
  const result = { name: 'mobile', errors, diagnostic: await diagnostics(page), eventCount: events.length, events }
  await context.close()
  return result
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
try {
  const mobileOnly = process.argv.includes('--mobile-only')
  const debugOnly = process.argv.includes('--debug-only')
  if (debugOnly) {
    const debug = await runDebug(browser)
    console.log(JSON.stringify({ debug }, null, 2))
  } else {
    const desktop = mobileOnly ? null : await runDesktop(browser)
    const debug = mobileOnly ? null : await runDebug(browser)
    const mobile = await runMobile(browser)
    if (mobileOnly) {
      console.log(JSON.stringify({ mobile: { ...mobile, events: undefined } }, null, 2))
    } else {
      const results = [desktop, debug, mobile]
      const eventNames = desktop.events.map(({ name }) => name)
      const requiredSequence = [
        'game_loaded', 'start_game_clicked', 'day_started', 'tutorial_started',
        'first_order_completed', 'tutorial_completed', 'day_completed', 'summary_viewed', 'next_day_clicked',
      ]
      let cursor = -1
      for (const name of requiredSequence) {
        cursor = eventNames.indexOf(name, cursor + 1)
        assert(cursor >= 0, `Desktop event sequence is missing ${name}`)
      }
      const tutorialSteps = ['customer-arrival', 'noodle', 'egg', 'wait-egg', 'hot-dog', 'wait-hot-dog', 'sauce', 'scallion', 'cut', 'roll', 'pack', 'serve']
      for (const step of tutorialSteps) {
        assert(desktop.events.some((event) => event.name === 'tutorial_step_viewed' && event.properties.step === step), `Missing tutorial view: ${step}`)
        assert(desktop.events.some((event) => event.name === 'tutorial_step_completed' && event.properties.step === step), `Missing tutorial completion: ${step}`)
      }
      assert(mobile.events.some(({ name }) => name === 'first_order_completed'), 'Mobile first order did not complete')
      assert(results.every(({ errors }) => errors.consoleErrors.length === 0 && errors.pageErrors.length === 0), 'Browser errors found')
      assert(results.every(({ diagnostic }) => !diagnostic.horizontalOverflow && !diagnostic.verticalOverflow), 'Viewport overflow found')
      await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
      process.stdout.write(JSON.stringify({
        desktopEvents: desktop.eventCount,
        mobileEvents: mobile.eventCount,
        desktopDiagnostic: desktop.diagnostic,
        debugDiagnostic: debug.diagnostic,
        mobileDiagnostic: mobile.diagnostic,
      }, null, 2))
    }
  }
} finally {
  await browser.close()
  server.kill()
}
