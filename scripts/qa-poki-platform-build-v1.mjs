import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

const root = process.cwd()
const port = 4197
const baseUrl = `http://127.0.0.1:${port}`
const sdkUrl = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'poki-platform-build-v1')
const mobileFinalOutputDir = path.join(root, 'docs', 'qa', 'screenshots', 'poki-mobile-final-fix')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const mobileFinalOnly = process.env.POKI_MOBILE_FINAL_ONLY === '1'
const results = { viewports: [], lifecycle: null, storageFailure: null, mobileFinal: [], mobileHudLayout: [], mobileHudContactSheet: null, localeResolution: null, requests: [], errors: [], bytes: {} }

await mkdir(outputDir, { recursive: true })
await mkdir(mobileFinalOutputDir, { recursive: true })
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

async function openHome(page, initScript, search = '?lang=en&playtest=1&debug=1', initScriptArg) {
  if (initScript) await page.addInitScript(initScript, initScriptArg)
  else await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto(`${baseUrl}/${search}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
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

async function inspectHudLayout(page, width, height) {
  const layout = await page.evaluate(() => {
    const selectors = {
      day: '.gameplay-hud__day',
      orders: '.gameplay-hud__orders',
      coins: '.gameplay-hud__coins',
      pause: '.gameplay-hud__control--pause',
      sound: '.gameplay-hud__control--sound',
    }
    const readRect = (selector) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Missing HUD element: ${selector}`)
      const rect = element.getBoundingClientRect()
      return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height }
    }
    const intersectionArea = (first, second) => Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
      * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top))
    const elements = Object.fromEntries(Object.entries(selectors).map(([name, selector]) => [name, readRect(selector)]))
    const pairs = [['day', 'orders'], ['orders', 'coins'], ['coins', 'pause'], ['pause', 'sound']]
      .map(([first, second]) => ({ first, second, intersectionArea: intersectionArea(elements[first], elements[second]) }))
    const bubble = readRect('.kitchen-customer__bubble')
    return {
      elements,
      pairs,
      orderBubble: bubble,
      ordersBubbleIntersectionArea: intersectionArea(elements.orders, bubble),
    }
  })
  for (const pair of layout.pairs) {
    assert(pair.intersectionArea === 0,
      `${width}x${height} HUD overlap ${pair.first}/${pair.second}: ${pair.intersectionArea}.`)
  }
  assert(layout.ordersBubbleIntersectionArea === 0,
    `${width}x${height} Orders overlaps the order bubble: ${layout.ordersBubbleIntersectionArea}.`)
  return layout
}

async function localeMetadata(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    locale: document.documentElement.dataset.locale,
  }))
}

async function runLocaleResolution(browser) {
  const cases = []
  for (const testCase of [
    { search: '', stored: 'zh-CN', expected: 'en', name: 'poki default ignores stored Chinese' },
    { search: '?lang=zh-CN', stored: 'en', expected: 'zh-CN', name: 'explicit Chinese override' },
    { search: '?lang=en', stored: 'zh-CN', expected: 'en', name: 'explicit English override' },
  ]) {
    const { context, page, errors } = await createPage(browser, { viewport: { width: 836, height: 470 } })
    await openHome(page, ({ stored }) => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem('night-market-locale-v1', stored)
    }, testCase.search, { stored: testCase.stored })
    const metadata = await localeMetadata(page)
    assert(metadata.lang === testCase.expected && metadata.locale === testCase.expected,
      `${testCase.name} resolved ${JSON.stringify(metadata)}.`)
    assert(errors.length === 0, `${testCase.name} browser errors: ${errors.join('; ')}`)
    cases.push({ ...testCase, ...metadata })
    await context.close()
  }
  results.localeResolution = cases
}

async function readSceneScale(page) {
  return page.locator('.game-screen__logical').evaluate((element) => Number(
    element.style.getPropertyValue('--scene-scale'),
  ))
}

async function exerciseHudGeometry(page) {
  let client = cdpSessions.get(page)
  if (!client) { client = await page.context().newCDPSession(page); cdpSessions.set(page, client) }
  const controls = [
    { name: 'day-home', selector: '.gameplay-hud__day' },
    { name: 'pause', selector: '.gameplay-hud__control--pause' },
    { name: 'sound', selector: '.gameplay-hud__control--sound' },
  ]
  const readGeometry = (locator) => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top,
      left: rect.left,
      transform: getComputedStyle(element).transform,
    }
  })
  const records = []
  for (const control of controls) {
    const locator = page.locator(control.selector)
    const box = await locator.boundingBox()
    assert(box, `${control.name} HUD control has no bounds.`)
    const normal = await readGeometry(locator)
    const id = pointerId++
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id, radiusX: 1, radiusY: 1, force: 1 }
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    const pressed = await readGeometry(locator)
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const released = await readGeometry(locator)
    for (const axis of ['top', 'left']) {
      assert(pressed[axis] === normal[axis] && released[axis] === normal[axis],
        `${control.name} HUD ${axis} moved during touch: ${normal[axis]} -> ${pressed[axis]} -> ${released[axis]}.`)
    }
    assert(pressed.transform === normal.transform && released.transform === normal.transform,
      `${control.name} HUD transform changed during touch: ${normal.transform} -> ${pressed.transform} -> ${released.transform}.`)
    records.push({ name: control.name, normal, pressed, released })
  }
  return records
}

async function exerciseHud(page) {
  const geometry = await exerciseHudGeometry(page)
  const sound = page.locator('.gameplay-hud__control--sound')
  const pause = page.locator('.gameplay-hud__control--pause')
  const home = page.locator('.gameplay-hud__day')
  const soundStates = [await sound.getAttribute('aria-pressed')]
  for (let index = 0; index < 5; index += 1) {
    const before = await sound.getAttribute('aria-pressed')
    await sound.tap()
    await page.waitForTimeout(100)
    const after = await sound.getAttribute('aria-pressed')
    assert(after !== before, `Sound tap ${index + 1} did not toggle exactly once: ${before} -> ${after}.`)
    soundStates.push(after)
  }

  const pauseCycles = []
  for (let index = 0; index < 3; index += 1) {
    const before = await page.evaluate(() => [...window.__pokiMockEvents])
    await pause.tap()
    await page.locator('.menu-modal').waitFor({ state: 'visible' })
    assert(await page.locator('.menu-modal').count() === 1, `Pause tap ${index + 1} opened duplicate menus.`)
    await page.locator('.menu-modal .modal-close').tap()
    await page.locator('[data-platform-input-lock]').waitFor()
    await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'commercialBreak:start')
    await page.evaluate(() => window.__resolveCommercialBreak())
    await page.locator('[data-platform-input-lock]').waitFor({ state: 'detached' })
    await page.locator('.menu-modal').waitFor({ state: 'detached' })
    await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStart')
    const after = await page.evaluate(() => [...window.__pokiMockEvents])
    const added = after.slice(before.length)
    assert(added.filter((event) => event === 'gameplayStop').length === 1,
      `Pause tap ${index + 1} emitted duplicate gameplayStop: ${added.join(', ')}`)
    assert(added.filter((event) => event === 'gameplayStart').length === 1,
      `Resume tap ${index + 1} emitted duplicate gameplayStart: ${added.join(', ')}`)
    assert(added.filter((event) => event === 'commercialBreak:start').length === 1,
      `Resume tap ${index + 1} emitted duplicate commercial break: ${added.join(', ')}`)
    pauseCycles.push(added)
  }

  const homeCycles = []
  for (let index = 0; index < 2; index += 1) {
    const before = await page.evaluate(() => [...window.__pokiMockEvents])
    await home.tap()
    await page.locator('.abandon-modal').waitFor({ state: 'visible' })
    assert(await page.locator('.abandon-modal').count() === 1, `Home tap ${index + 1} opened duplicate dialogs.`)
    await page.getByRole('button', { name: 'Keep Cooking' }).tap()
    await page.locator('.abandon-modal').waitFor({ state: 'detached' })
    await page.waitForFunction(() => window.__pokiMockEvents?.at(-1) === 'gameplayStart')
    const after = await page.evaluate(() => [...window.__pokiMockEvents])
    const added = after.slice(before.length)
    assert(added.filter((event) => event === 'gameplayStop').length === 1,
      `Home tap ${index + 1} emitted duplicate gameplayStop: ${added.join(', ')}`)
    assert(added.filter((event) => event === 'gameplayStart').length === 1,
      `Home cancel ${index + 1} emitted duplicate gameplayStart: ${added.join(', ')}`)
    homeCycles.push(added)
  }

  return { geometry, soundStates, pauseCycles, homeCycles }
}

async function exerciseViewportStability(page, width, height) {
  const initialScale = await readSceneScale(page)
  const toolbarBurstScales = await page.evaluate(async () => {
    const read = () => Number(document.querySelector('.game-screen__logical')?.style.getPropertyValue('--scene-scale'))
    const scales = [read()]
    for (let index = 0; index < 5; index += 1) {
      window.visualViewport?.dispatchEvent(new Event('resize'))
      await new Promise((resolve) => requestAnimationFrame(resolve))
      scales.push(read())
    }
    return scales
  })
  assert(new Set(toolbarBurstScales.map((value) => value.toFixed(6))).size === 1,
    `Toolbar-like resize burst changed scene scale: ${toolbarBurstScales.join(', ')}`)

  const resized = { width: 720, height: 405 }
  await page.setViewportSize(resized)
  await page.waitForFunction((previous) => {
    const value = Number(document.querySelector('.game-screen__logical')?.style.getPropertyValue('--scene-scale'))
    return Math.abs(value - previous) > .0001
  }, initialScale)
  const resizedScale = await readSceneScale(page)
  await page.setViewportSize({ width, height })
  await page.waitForFunction((expected) => {
    const value = Number(document.querySelector('.game-screen__logical')?.style.getPropertyValue('--scene-scale'))
    return Math.abs(value - expected) < .0001
  }, initialScale)
  return { initialScale, toolbarBurstScales, resized, resizedScale, restoredScale: await readSceneScale(page) }
}

async function summaryContainment(page) {
  return page.evaluate(() => {
    const within = (child, parent, tolerance = 1) => {
      const c = child.getBoundingClientRect()
      const p = parent.getBoundingClientRect()
      return c.left >= p.left - tolerance && c.top >= p.top - tolerance
        && c.right <= p.right + tolerance && c.bottom <= p.bottom + tolerance
    }
    const funds = document.querySelector('.summary-screen .upgrade-shop__funds')
    const copies = [...document.querySelectorAll('.summary-screen .upgrade-shop__copy')]
    const entries = [
      ...[...funds.querySelectorAll(':scope > span, :scope > b')]
        .filter((child) => child.textContent.trim().length > 0)
        .map((child) => ({ group: 'funds', text: child.textContent.trim(), contained: within(child, funds) })),
      ...copies.flatMap((copy, index) => [...copy.children].map((child) => ({ group: `upgrade-${index + 1}`, text: child.textContent.trim(), contained: within(child, copy) }))),
    ]
    return {
      fundsText: funds.innerText.replace(/\s+/g, ''),
      upgradeText: copies.map((copy) => copy.innerText.replace(/\s+/g, ' ').trim()),
      entries,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      clipped: entries.filter((entry) => !entry.contained),
    }
  })
}

async function runMobileFinal(browser, width, height) {
  const { context, page, requests, errors } = await createPage(browser, {
    viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1,
  })
  await openHome(page, () => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('night-market-locale-v1', 'zh-CN')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({
      coins: 30, fireLevel: 0, signLevel: 0, bestStars: {}, maxUnlockedDay: 1,
    }))
  }, '')
  const locale = await localeMetadata(page)
  assert(locale.lang === 'en' && locale.locale === 'en', `${width}x${height} parameterless Poki launch was not English.`)
  await startDayOne(page, true)
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  await page.locator('.kitchen-customer__bubble').first().waitFor({ state: 'visible', timeout: 30_000 })
  const gameplayDiagnostic = await viewportDiagnostics(page)
  assert(!gameplayDiagnostic.horizontalOverflow && !gameplayDiagnostic.verticalOverflow,
    `${width}x${height} gameplay overflow: ${JSON.stringify(gameplayDiagnostic)}`)
  const hudLayout = await inspectHudLayout(page, width, height)
  const gameplayScreenshot = `gameplay-${width}x${height}.png`
  await page.screenshot({ path: path.join(mobileFinalOutputDir, gameplayScreenshot) })
  results.mobileHudLayout.push({ width, height, screenshot: gameplayScreenshot, ...hudLayout })
  const hud = await exerciseHud(page)
  const viewportStability = await exerciseViewportStability(page, width, height)

  await completeOrder(page, true)
  await completeOrder(page, true)
  await completeOrder(page, true)
  await page.locator('[data-ui-screen="summary"]').waitFor({ timeout: 30_000 })
  const containment = await summaryContainment(page)
  assert(containment.fundsText === 'Cash¥60', `${width}x${height} funds copy was ${containment.fundsText}.`)
  assert(containment.upgradeText[0].includes('Upgrade Heat Lv.1'), `${width}x${height} heat title missing.`)
  assert(containment.upgradeText[1].includes('Upgrade Sign Lv.1'), `${width}x${height} sign title missing.`)
  assert(containment.clipped.length === 0, `${width}x${height} Summary copy escaped its card: ${JSON.stringify(containment.clipped)}`)
  assert(!containment.horizontalOverflow, `${width}x${height} Summary has horizontal overflow.`)
  await page.screenshot({ path: path.join(mobileFinalOutputDir, `summary-${width}x${height}.png`) })

  assert(errors.length === 0, `${width}x${height} mobile final browser errors: ${errors.join('; ')}`)
  const result = { width, height, locale, gameplayDiagnostic, hudLayout, viewportStability, hud, containment }
  results.mobileFinal.push(result)
  results.requests.push(...requests)
  results.errors.push(...errors)
  await context.close()
}

async function runMobileHudLayout(browser, width, height) {
  const { context, page, requests, errors } = await createPage(browser, {
    viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 1,
  })
  await openHome(page, () => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('night-market-locale-v1', 'zh-CN')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({
      coins: 30, fireLevel: 0, signLevel: 0, bestStars: {}, maxUnlockedDay: 1,
    }))
  }, '')
  const locale = await localeMetadata(page)
  assert(locale.lang === 'en' && locale.locale === 'en', `${width}x${height} HUD QA was not English.`)
  await startDayOne(page, true)
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0, null, { timeout: 30_000 })
  await page.locator('.kitchen-customer__bubble').first().waitFor({ state: 'visible', timeout: 30_000 })
  const gameplayDiagnostic = await viewportDiagnostics(page)
  assert(!gameplayDiagnostic.horizontalOverflow && !gameplayDiagnostic.verticalOverflow,
    `${width}x${height} HUD QA overflow: ${JSON.stringify(gameplayDiagnostic)}`)
  const hudLayout = await inspectHudLayout(page, width, height)
  const gameplayScreenshot = `gameplay-${width}x${height}.png`
  await page.screenshot({ path: path.join(mobileFinalOutputDir, gameplayScreenshot) })
  results.mobileHudLayout.push({ width, height, screenshot: gameplayScreenshot, ...hudLayout })
  results.requests.push(...requests)
  results.errors.push(...errors)
  assert(errors.length === 0, `${width}x${height} HUD QA browser errors: ${errors.join('; ')}`)
  await context.close()
}

async function createMobileHudContactSheet() {
  const frames = [[640, 360], [836, 470], [844, 390]].map(([width, height]) => ({
    width,
    height,
    file: `gameplay-${width}x${height}.png`,
  }))
  const cellWidth = 844
  const cellHeight = 470
  const labelHeight = 48
  const gap = 16
  const background = { r: 11, g: 20, b: 36, alpha: 1 }
  const composites = []
  for (const [index, frame] of frames.entries()) {
    const source = path.join(mobileFinalOutputDir, frame.file)
    const metadata = await sharp(source).metadata()
    assert(metadata.width === frame.width && metadata.height === frame.height,
      `${frame.file} dimensions were ${metadata.width}x${metadata.height}.`)
    const image = await sharp(source)
      .resize({ width: cellWidth, height: cellHeight, fit: 'contain', background })
      .png()
      .toBuffer()
    const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b1424"/><text x="50%" y="31" text-anchor="middle" fill="#f7e6bd" font-family="Arial, sans-serif" font-size="22" font-weight="700">Poki production · English · ${frame.width}×${frame.height}</text></svg>`)
    const left = index * (cellWidth + gap)
    composites.push({ input: label, left, top: 0 }, { input: image, left, top: labelHeight })
  }
  const contactSheet = 'mobile-hud-contact-sheet.png'
  const sheetWidth = cellWidth * frames.length + gap * (frames.length - 1)
  const sheetHeight = labelHeight + cellHeight
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 4, background } })
    .composite(composites)
    .png()
    .toFile(path.join(mobileFinalOutputDir, contactSheet))
  results.mobileHudContactSheet = { file: contactSheet, width: sheetWidth, height: sheetHeight, frames }
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
  await runLocaleResolution(browser)
  if (!mobileFinalOnly) {
    await runLifecycle(browser)
    for (const [width, height] of [[640, 360], [836, 470], [1031, 580], [1440, 810]]) await runViewport(browser, width, height, false)
    for (const [width, height] of [[640, 360], [836, 470]]) await runViewport(browser, width, height, true)
  }
  for (const [width, height] of [[640, 360], [836, 470]]) await runMobileFinal(browser, width, height)
  await runMobileHudLayout(browser, 844, 390)
  await createMobileHudContactSheet()
  if (!mobileFinalOnly) { await runPortrait(browser); await runStorageFailure(browser) }
  const unexpected = [...new Set(results.requests)].filter((url) => !url.startsWith(baseUrl) && url !== sdkUrl)
  assert(unexpected.length === 0, `Unexpected external requests: ${unexpected.join(', ')}`)
  results.requests = [...new Set(results.requests)]
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  await writeFile(path.join(mobileFinalOutputDir, 'qa-results.json'), JSON.stringify({
    localeResolution: results.localeResolution,
    mobileFinal: results.mobileFinal,
    mobileHudLayout: results.mobileHudLayout,
    mobileHudContactSheet: results.mobileHudContactSheet,
    errors: results.errors,
  }, null, 2))
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser.close(); server.kill()
}
