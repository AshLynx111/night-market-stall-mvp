import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4197
const baseUrl = `http://127.0.0.1:${port}`
const sdkUrl = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'poki-platform-build-v1')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const results = { viewports: [], lifecycle: null, storageFailure: null, requests: [], errors: [], bytes: {} }

await mkdir(outputDir, { recursive: true })
const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--mode', 'poki',
  '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk })
server.stderr.on('data', (chunk) => { serverLog += chunk })

function assert(condition, message) { if (!condition) throw new Error(message) }
async function waitForServer() {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try { if ((await fetch(baseUrl)).ok) return } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Preview did not start:\n${serverLog}`)
}

const mockSdk = `
window.__pokiMockEvents=[]; window.__resolveCommercialBreak=null;
window.PokiSDK={
 init:async()=>{window.__pokiMockEvents.push('init')},
 gameLoadingFinished:()=>window.__pokiMockEvents.push('gameLoadingFinished'),
 gameplayStart:()=>window.__pokiMockEvents.push('gameplayStart'),
 gameplayStop:()=>window.__pokiMockEvents.push('gameplayStop'),
 commercialBreak:()=>new Promise(resolve=>{window.__pokiMockEvents.push('commercialBreak:start');window.__resolveCommercialBreak=()=>{window.__pokiMockEvents.push('commercialBreak:end');window.__resolveCommercialBreak=null;resolve()}})
};`

async function createPage(browser, options = {}) {
  const context = await browser.newContext(options)
  const page = await context.newPage()
  const requests = []
  const errors = []
  await page.route(sdkUrl, (route) => route.fulfill({ contentType: 'application/javascript', body: mockSdk }))
  page.on('request', (request) => requests.push(request.url()))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
  return { context, page, requests, errors }
}

async function openHome(page, initScript) {
  if (initScript) await page.addInitScript(initScript)
  else await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto(`${baseUrl}/?lang=en&playtest=1&debug=1`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="home"]').waitFor({ timeout: 120_000 })
  await page.waitForFunction(() => window.__pokiMockEvents?.includes('gameLoadingFinished'), null, { timeout: 120_000 })
  assert(await page.locator('[data-playtest-debug]').count() === 0, 'Poki build displayed the debug panel.')
  assert(await page.locator('.playtest-feedback-link').count() === 0, 'Poki build displayed feedback UI.')
}

async function startDayOne(page, touch = false) {
  const start = page.getByRole('button', { name: 'Start Game' })
  touch ? await start.tap() : await start.click()
  await page.locator('[data-ui-screen="playing"]').waitFor({ timeout: 30_000 })
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStart')
}

async function selectIngredient(page, id, touch) {
  const control = page.locator(`[data-ingredient-id="${id}"]`)
  await control.waitFor({ state: 'visible', timeout: 30_000 })
  touch ? await control.tap() : await control.click()
}
const cdpSessions = new WeakMap()
let pointerId = 100
async function pathGesture(page, target, points, touch) {
  const box = await target.boundingBox(); assert(box, 'Gesture target has no bounds.')
  const absolute = points.map(({ x, y }) => ({ x: box.x + box.width * x, y: box.y + box.height * y }))
  if (!touch) {
    await page.mouse.move(absolute[0].x, absolute[0].y); await page.mouse.down()
    for (const point of absolute.slice(1)) await page.mouse.move(point.x, point.y, { steps: 5 })
    await page.mouse.up(); return
  }
  let client = cdpSessions.get(page)
  if (!client) { client = await page.context().newCDPSession(page); cdpSessions.set(page, client) }
  const id = pointerId++
  const tp = ({ x, y }) => ({ x, y, id, radiusX: 1, radiusY: 1, force: 1 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(absolute[0])] })
  for (const point of absolute.slice(1)) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tp(point)] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
async function waitStep(page, step) { await page.locator(`[data-slot-id="left"][data-expected-step-id="${step}"]`).waitFor({ timeout: 30_000 }) }
async function isStep(page, step) { return Boolean(await page.locator(`[data-slot-id="left"][data-expected-step-id="${step}"]`).count()) }
async function gesture(page, points, touch) { await pathGesture(page, page.locator('[data-gesture-slot-id="left"]'), points, touch) }

async function completeOrder(page, touch) {
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  await selectIngredient(page, 'noodle', touch); await waitStep(page, 'egg')
  await selectIngredient(page, 'egg', touch); await waitStep(page, 'hot-dog')
  await selectIngredient(page, 'hot-dog', touch); await waitStep(page, 'sauce')
  await selectIngredient(page, 'sauce', touch)
  for (let i = 0; i < 4 && await isStep(page, 'sauce'); i++) {
    await gesture(page, [{ x: .18, y: .44 }, { x: .82, y: .44 }, { x: .82, y: .62 }, { x: .18, y: .62 }], touch)
    await page.waitForTimeout(touch ? 150 : 30)
  }
  await waitStep(page, 'scallion'); await selectIngredient(page, 'scallion', touch); await waitStep(page, 'cut')
  for (const y of [.3, .5, .7, .3, .5]) {
    if (!await isStep(page, 'cut')) break
    await gesture(page, [{ x: .15, y }, { x: .5, y }, { x: .85, y }], touch); await page.waitForTimeout(touch ? 150 : 30)
  }
  await waitStep(page, 'roll'); await gesture(page, [{ x: .1, y: .51 }, { x: .5, y: .5 }, { x: .9, y: .49 }], touch)
  const food = page.locator('[data-slot-id="left"] .griddle-slot__food:not(:disabled)'); await food.waitFor({ state: 'visible' })
  touch ? await food.tap() : await food.click()
  const tray = page.locator('[data-tray-slot-id="left"]'); await tray.waitFor({ state: 'visible' })
  touch ? await tray.tap() : await tray.click()
  await page.waitForFunction(() => document.querySelector('[data-ui-screen="summary"]') || document.querySelector('[data-slot-id="left"][data-stage-step="empty"]'), null, { timeout: 30_000 })
}

async function viewportDiagnostics(page) {
  return page.evaluate(() => {
    const visible = (selector) => { const el = document.querySelector(selector); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight }
    return {
      screen: document.querySelector('[data-ui-screen]')?.getAttribute('data-ui-screen'),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      verticalOverflow: document.documentElement.scrollHeight > innerHeight + 1,
      hud: visible('.gameplay-hud'), customer: visible('.kitchen-customer__actor'), rack: visible('[data-kitchen-bin-rack]'),
      leftGriddle: visible('[data-slot-id="left"]'), rightGriddle: visible('[data-slot-id="right"]'), tray: visible('.serving-tray'),
    }
  })
}

async function runLifecycle(browser) {
  const { context, page, requests, errors } = await createPage(browser, { viewport: { width: 1440, height: 810 } })
  await openHome(page); await page.screenshot({ path: path.join(outputDir, 'home-1440x810.png') }); await startDayOne(page)
  const initialEvents = await page.evaluate(() => [...window.__pokiMockEvents])
  assert(initialEvents.filter((event) => event === 'gameLoadingFinished').length === 1, 'loadingFinished was not exactly once.')
  assert(initialEvents.filter((event) => event === 'gameplayStart').length === 1, 'First Start emitted duplicate gameplayStart.')
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  await page.locator('.kitchen-customer__patience span').first().waitFor({ state: 'visible' })
  await page.locator('.gameplay-hud__control--pause').click()
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStop')
  const patienceBefore = await page.locator('.kitchen-customer__patience span').first().getAttribute('style')
  const heatBefore = await page.locator('[data-slot-id="left"]').getAttribute('data-stage-step')
  const saveBefore = await page.evaluate(() => localStorage.getItem('night-market-campaign-v1'))
  await page.locator('.menu-modal .modal-close').click()
  await page.locator('[data-platform-input-lock]').waitFor()
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'commercialBreak:start')
  await page.waitForTimeout(2_000)
  assert(await page.locator('.kitchen-customer__patience span').first().getAttribute('style') === patienceBefore, 'Patience advanced during ad.')
  assert(await page.locator('[data-slot-id="left"]').getAttribute('data-stage-step') === heatBefore, 'Cooking state advanced during ad.')
  assert(await page.evaluate(() => localStorage.getItem('night-market-campaign-v1')) === saveBefore, 'Save changed during ad.')
  assert((await page.evaluate(() => window.__pokiMockEvents)).at(-1) === 'commercialBreak:start', 'Gameplay restarted before ad resolved.')
  await page.evaluate(() => window.__resolveCommercialBreak())
  await page.locator('[data-platform-input-lock]').waitFor({ state: 'detached' })
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStart')
  await completeOrder(page, false); await completeOrder(page, false); await completeOrder(page, false)
  await page.locator('[data-ui-screen="summary"]').waitFor({ timeout: 30_000 })
  await page.screenshot({ path: path.join(outputDir, 'summary-1440x810.png') })
  await page.locator('.summary-actions button:last-child').click()
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'commercialBreak:start')
  await page.evaluate(() => window.__resolveCommercialBreak())
  await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor({ timeout: 30_000 })
  await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStart')
  const events = await page.evaluate(() => [...window.__pokiMockEvents])
  const lifecycleOnly = events.filter((event) => event !== 'init')
  assert(!lifecycleOnly.some((event, index) => index && event === lifecycleOnly[index - 1] && (event === 'gameplayStart' || event === 'gameplayStop')), 'Adjacent duplicate lifecycle edge.')
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`)
  results.lifecycle = { events, freezeMs: 2_000, finalScreen: 'day-2' }; results.requests.push(...requests); results.errors.push(...errors)
  await context.close()
}

async function runViewport(browser, width, height, touch) {
  const { context, page, requests, errors } = await createPage(browser, { viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
  await openHome(page); await startDayOne(page, touch)
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  const diagnostic = await viewportDiagnostics(page)
  assert(!diagnostic.horizontalOverflow && !diagnostic.verticalOverflow, `${width}x${height} overflow.`)
  assert(diagnostic.hud && diagnostic.customer && diagnostic.rack && diagnostic.leftGriddle && diagnostic.rightGriddle && diagnostic.tray, `${width}x${height} clipped a gameplay region: ${JSON.stringify(diagnostic)}`)
  if (touch) await completeOrder(page, true)
  const suffix = touch ? '-touch' : ''
  await page.screenshot({ path: path.join(outputDir, `day1-${width}x${height}${suffix}.png`) })
  results.viewports.push({ width, height, touch, ...diagnostic, firstOrderCompleted: touch })
  results.requests.push(...requests); results.errors.push(...errors)
  assert(errors.length === 0, `${width}x${height} browser errors: ${errors.join('; ')}`)
  await context.close()
}

async function runPortrait(browser) {
  const { context, page, errors } = await createPage(browser, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  await openHome(page); await startDayOne(page, true)
  await page.locator('.rotate-device').waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(outputDir, 'rotate-390x844.png') })
  assert(errors.length === 0, `Portrait errors: ${errors.join('; ')}`); await context.close()
}

async function runStorageFailure(browser) {
  const { context, page, errors } = await createPage(browser, { viewport: { width: 836, height: 470 } })
  await openHome(page, () => {
    const denied = () => { throw new Error('storage denied for QA') }
    Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: denied })
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: denied })
  })
  await startDayOne(page); await selectIngredient(page, 'noodle', false); await waitStep(page, 'egg')
  assert(errors.length === 0, `Storage denial caused errors: ${errors.join('; ')}`)
  results.storageFailure = { home: true, day1: true, firstIngredient: true }; await context.close()
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
try {
  await runLifecycle(browser)
  for (const [width, height] of [[640, 360], [836, 470], [1031, 580], [1440, 810]]) await runViewport(browser, width, height, false)
  for (const [width, height] of [[640, 360], [836, 470]]) await runViewport(browser, width, height, true)
  await runPortrait(browser); await runStorageFailure(browser)
  const unexpected = [...new Set(results.requests)].filter((url) => !url.startsWith(baseUrl) && url !== sdkUrl)
  assert(unexpected.length === 0, `Unexpected external requests: ${unexpected.join(', ')}`)
  results.requests = [...new Set(results.requests)]
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close(); server.kill()
}
