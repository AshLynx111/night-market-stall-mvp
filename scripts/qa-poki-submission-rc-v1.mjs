// Release-only browser audit. Uses production dist files; no runtime QA hooks.
import { chromium } from 'playwright'
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
process.env.POKI_RC_QA = '1'
const h = await import('./qa-poki-platform-build-v1.mjs')
const out = path.resolve('docs/qa/poki-rc-v1')
const reportFile = process.env.RC_CASE ? `qa-results-${process.env.RC_CASE.replace(/[^a-z0-9-]/gi, '_')}.json` : 'qa-results.json'
await mkdir(out, { recursive: true })
const report = { environment: 'Windows Edge Chromium, production files, network-injected SDK mock; NOT live Inspector or physical Safari', cases: [], requests: [], console: [], errors: [], httpErrors: [], failedRequests: [], language: [] }
const check = (ok, message) => { if (!ok) throw new Error(message) }
let active = ''
const saveKey = 'night-market-campaign-v1'
const soundKey = 'night-market-audio-settings-v1'
const sampleSave = day => ({ coins: 360, fireLevel: 1, signLevel: 1, bestStars: Object.fromEntries(Array.from({ length: day - 1 }, (_, i) => [i + 1, 3])), maxUnlockedDay: day })
let browser
async function pageFor({ width = 1440, height = 810, touch = false, sdk = 'mock', origin = h.baseUrl } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  const caseName = active
  context.on('request', request => {
    const url = request.url(), u = new URL(url)
    const allowed = u.origin === origin || url === h.sdkUrl
    report.requests.push({ case: caseName, request: url, domain: u.host, reason: url === h.sdkUrl ? `Poki SDK (${sdk})` : request.resourceType(), allowed })
  })
  page.on('console', msg => { if (['warning', 'error'].includes(msg.type())) report.console.push({ case: caseName, type: msg.type(), message: msg.text() }) })
  page.on('pageerror', error => report.errors.push({ case: caseName, message: error.message }))
  context.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ case: caseName, url: response.url(), status: response.status() }) })
  context.on('requestfailed', request => report.failedRequests.push({ case: caseName, url: request.url(), failure: request.failure() }))
  await context.route('**/*', async route => {
    const url = route.request().url()
    if (url === h.sdkUrl) {
      if (sdk === 'real') return route.continue()
      let body = h.mockSdk + ';window.__sdkTimes={init:performance.now()};const oldLoading=window.PokiSDK.gameLoadingFinished;window.PokiSDK.gameLoadingFinished=()=>{window.__sdkTimes.loadingFinished=performance.now();oldLoading()};'
      if (sdk === 'init-reject') body += ';window.PokiSDK.init=async()=>{throw new Error("RC injected init reject")};'
      if (sdk === 'break-reject') body += ';window.PokiSDK.commercialBreak=async()=>{window.__pokiMockEvents.push("commercialBreak:reject");throw new Error("RC injected break reject")};'
      if (sdk === 'no-ad') body += ';window.PokiSDK.commercialBreak=async()=>{window.__pokiMockEvents.push("commercialBreak:no-ad");return false};'
      if (sdk === 'missing') body = '// RC injected SDK unavailable; successful script response without global.'
      if (sdk === 'delayed') body = `setTimeout(()=>{${body}},500)`
      return route.fulfill({ contentType: 'application/javascript', body })
    }
    if (new URL(url).origin !== origin) return route.abort('blockedbyclient')
    return route.continue()
  })
  return { page, context }
}
async function seed(page, day = 1, guided = true, audio = false) {
  await page.addInitScript(({ save, guided, audio, saveKey, soundKey }) => {
    localStorage.clear(); sessionStorage.clear()
    localStorage.setItem(saveKey, JSON.stringify(save))
    localStorage.setItem('night-market-guided-tutorial-v2', String(!guided))
    localStorage.setItem('night-market-locale-v1', 'zh-CN')
    if (audio) localStorage.setItem(soundKey, JSON.stringify({ master: .7, music: .4, effects: .6, musicMuted: false }))
  }, { save: sampleSave(day), guided, audio, saveKey, soundKey })
}
async function home(page, search = '', origin = h.baseUrl, sdkReady = true) {
  await page.goto(origin + '/' + search, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('[data-ui-screen="home"]').waitFor()
  if (sdkReady) await page.waitForFunction(() => window.__pokiMockEvents?.includes('gameLoadingFinished'))
  await english(page, 'Home')
}
async function english(page, screen) {
  check(await page.locator('html').getAttribute('lang') === 'en', `${screen}: language not English`)
  const text = await page.locator('body').innerText()
  const chinese = text.match(/[\u4e00-\u9fff]+/g) || []
  report.language.push({ case: active, screen, chinese })
  check(chinese.length === 0, `${screen}: unexpected Chinese DOM: ${chinese.join(',')}`)
}
async function start(page, day = 1, touch = false, ready = true) {
  const button = page.getByRole('button', { name: day === 1 ? 'Start Game' : 'Continue', exact: true })
  touch ? await button.tap() : await button.click()
  await page.locator(`[data-ui-screen="playing"][data-day="${day}"]`).waitFor()
  if (ready) await page.waitForFunction(() => window.__pokiMockEvents.at(-1) === 'gameplayStart')
  await page.locator('.kitchen-customer__actor.presence-active').first().waitFor()
  await english(page, `Day ${day} gameplay/tutorial/orders/ingredients`)
}
async function resolveAd(page) {
  await page.waitForFunction(() => typeof window.__resolveCommercialBreak === 'function')
  await page.evaluate(() => window.__resolveCommercialBreak())
  await page.locator('[data-platform-input-lock]').waitFor({ state: 'detached' })
  await page.waitForFunction(() => window.__pokiMockEvents.at(-1) === 'gameplayStart')
}
async function dragIngredient(page, id, slot = 'left') {
  const source = await page.locator(`[data-ingredient-id="${id}"]`).boundingBox()
  const target = await page.locator(`[data-slot-id="${slot}"]`).boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const from = { x: source.x + source.width / 2, y: source.y + source.height / 2 }
  const to = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  const tp = p => [{ ...p, id: 77, radiusX: 1, radiusY: 1, force: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from) })
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp({ x: from.x + (to.x - from.x) * i / 12, y: from.y + (to.y - from.y) * i / 12 }) })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
async function genericOrder(page, serve = true) {
  const slot = page.locator('[data-slot-id="left"]')
  await page.locator('.kitchen-customer__actor.presence-active').first().waitFor()
  await page.waitForFunction(() => document.querySelector('[data-slot-id="left"]').dataset.stageStep === 'empty')
  await page.locator('[data-ingredient-id="noodle"]').press('Enter')
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    const step = await slot.getAttribute('data-expected-step-id')
    if (step === 'pack') {
      await slot.locator('.griddle-slot__food').press('Enter')
      if (!serve) return
      await page.locator('[data-tray-slot-id="left"]').press('Enter')
      await page.locator('[data-tray-slot-id="left"]').waitFor({ state: 'hidden' })
      return
    }
    if (step === 'sauce') await page.locator('[data-ingredient-id="sauce"]').press('Enter')
    if (['sauce', 'cut', 'roll'].includes(step)) await page.locator('[data-gesture-slot-id="left"]').press('Enter')
    else if (step) await page.locator(`[data-ingredient-id="${step === 'second-noodle' ? 'noodle' : step === 'second-egg' ? 'egg' : step}"]`).press('Enter')
    await page.waitForTimeout(100)
  }
  throw new Error('First order did not complete')
}
async function test(name, fn) {
  if (process.env.RC_CASE && !name.includes(process.env.RC_CASE)) return
  active = name
  console.log('RUN ' + name)
  const started = Date.now()
  try { report.cases.push({ name, status: 'PASS', details: await fn(), elapsedMs: Date.now() - started }) }
  catch (e) {
    report.cases.push({ name, status: 'FAIL', error: e.stack, elapsedMs: Date.now() - started }); console.error(name, e.message)
    const page = browser.contexts().at(-1)?.pages().at(-1)
    if (page) {
      await page.screenshot({path:path.join(out, `failure-${name.replace(/[^a-z0-9-]/gi, '_')}.png`)})
      await writeFile(path.join(out, `failure-${name.replace(/[^a-z0-9-]/gi, '_')}.html`), await page.content())
    }
  }
  finally { for (const context of browser.contexts()) await context.close(); await writeFile(path.join(out, reportFile), JSON.stringify(report, null, 2)) }
}
await h.waitForServer()
browser = await chromium.launch({ headless: true, executablePath: h.edgePath })
try {
  await test('fresh-root-performance-keyboard', async () => {
    const { page } = await pageFor()
    await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear() })
    await home(page)
    const timings = await page.evaluate(() => ({ homeObservedMs: performance.now(), sdk: window.__sdkTimes, navigation: performance.getEntriesByType('navigation')[0].toJSON(), transferredAtHome: performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, 0) }))
    await page.getByRole('button', { name: 'Start Game', exact: true }).press('Enter')
    await page.locator('[data-ui-screen="playing"]').waitFor()
    await page.keyboard.press('Escape')
    await page.locator('.menu-modal').waitFor()
    await english(page, 'Pause')
    check(await page.locator('.menu-modal').evaluate(el => el.contains(document.activeElement)), 'Dialog focus not inside menu')
    await page.locator('.menu-modal .modal-close').press('Space')
    await resolveAd(page)
    await h.completeOrder(page, false)
    const events = await page.evaluate(() => window.__pokiMockEvents)
    check(JSON.stringify(events) === JSON.stringify(['init', 'gameLoadingFinished', 'gameplayStart', 'gameplayStop', 'commercialBreak:start', 'commercialBreak:end', 'gameplayStart']), 'Fresh keyboard lifecycle sequence wrong: ' + events)
    return { timings, firstOrderCompleted: true, events }
  })
  for (const query of ['?playtest=1', '?debug=1', '?qa=1', '?playtest=1&debug=1&qa=1&pid=rc']) await test('production-flags-' + query, async () => {
    const { page } = await pageFor(); await home(page, query); await start(page)
    const text = await page.locator('body').innerText()
    check(!/Playtest Debug|Export Events|participant ID|feedback|developer|screenshot/i.test(text), 'Test UI appeared')
    check(await page.locator('[data-playtest-debug],.playtest-feedback-link').count() === 0, 'Debug UI appeared')
    return { query, testUi: false }
  })
  for (const failure of ['getItem', 'setItem', 'session-unavailable', 'all']) await test('storage-' + failure, async () => {
    const { page } = await pageFor()
    await page.addInitScript(failure => {
      const denied = () => { throw new Error('RC injected storage denied') }
      if (failure === 'all' || failure === 'getItem') Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: denied })
      if (failure === 'all' || failure === 'setItem') Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: denied })
      if (failure === 'all' || failure === 'session-unavailable') Object.defineProperty(window, 'sessionStorage', { configurable: true, get: denied })
    }, failure)
    await home(page); await start(page); await h.completeOrder(page, false)
    return { home: true, day1: true, firstOrderCompleted: true, persistenceRequired: false }
  })
  for (const sdk of ['init-reject', 'break-reject', 'no-ad', 'missing', 'delayed']) await test('sdk-' + sdk, async () => {
    const { page } = await pageFor({ sdk }); await home(page, '', h.baseUrl, !['missing', 'init-reject'].includes(sdk))
    await start(page, 1, false, !['missing', 'init-reject'].includes(sdk))
    await page.locator('.gameplay-hud__control--pause').click(); await page.locator('.menu-modal .modal-close').click()
    if (sdk === 'delayed') await resolveAd(page)
    await page.locator('[data-platform-input-lock]').waitFor({ state: 'detached' })
    await page.locator('.menu-modal').waitFor({ state: 'detached' })
    await h.completeOrder(page, false)
    check(await page.locator('audio').evaluateAll(els => els.every(a => !a.muted && a.volume > 0)), 'SDK failure left audio muted')
    return { firstOrderCompleted: true, inputUnlocked: true, audioRestored: true }
  })
  for (const [width, height] of [[1440,810],[1280,720],[1031,580],[836,470],[640,360]]) await test(`desktop-${width}x${height}`, async () => {
    const { page } = await pageFor({ width, height }); await home(page); await start(page)
    const geometry = await h.viewportDiagnostics(page); const hud = await h.inspectHudLayout(page, width, height)
    check(!geometry.horizontalOverflow && !geometry.verticalOverflow, 'Desktop scrollbars')
    await page.screenshot({ path: path.join(out, `desktop-${width}x${height}.png`) })
    for (let i = 0; i < 3; i++) await h.completeOrder(page, false)
    await page.locator('[data-ui-screen="summary"]').waitFor(); await english(page, 'Summary / upgrades')
    const summary = await h.summaryContainment(page); check(!summary.horizontalOverflow && summary.clipped.length === 0, 'Summary overflow')
    summary.messageBounds = await page.locator('.summary-message').evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el)
      const text = range.getBoundingClientRect(), panel = el.getBoundingClientRect()
      return { text: el.textContent, textRight: text.right, panelRight: panel.right, textLeft: text.left, panelLeft: panel.left, overflowsOwnPanel: text.right > panel.right + 1 || text.left < panel.left - 1 }
    })
    await page.screenshot({ path: path.join(out, `summary-${width}x${height}.png`) })
    const before = await page.evaluate(() => [...window.__pokiMockEvents])
    check(before.at(-1) === 'gameplayStop', 'Summary did not stop gameplay')
    await page.getByRole('button', { name: 'Play Again', exact: true }).click(); await resolveAd(page)
    await page.locator('[data-ui-screen="playing"][data-day="1"]').waitFor()
    return { geometry, hud, summary, playAgain: await page.evaluate(n => window.__pokiMockEvents.slice(n), before.length) }
  })
  for (const [width, height] of [[844,390],[836,470],[640,360]]) await test(`touch-${width}x${height}`, async () => {
    const { page } = await pageFor({ width, height, touch: true }); await home(page); await start(page, 1, true)
    await h.completeOrder(page, true)
    await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length > 0)
    await dragIngredient(page, 'noodle'); await h.waitStep(page, 'egg')
    const hud = await h.exerciseHud(page)
    return { firstOrderAllTouch: true, ingredientDrag: true, sauceCutRollPackServe: true, pauseSound: hud }
  })
  await test('ad-lock-active-cooking-touch-audio', async () => {
    const { page } = await pageFor({ width: 844, height: 390, touch: true }); await seed(page, 1, false, true); await home(page); await start(page, 1, true)
    await page.locator('[data-ingredient-id="noodle"]').tap(); await h.waitStep(page, 'egg')
    await page.locator('[data-ingredient-id="egg"]').tap(); await h.waitStep(page, 'hot-dog')
    const read = () => page.evaluate(soundKey => ({
      patience: [...document.querySelectorAll('.kitchen-customer__patience span')].map(e => e.getAttribute('style')),
      slots: [...document.querySelectorAll('[data-slot-id]')].map(e => ({ step: e.dataset.stageStep, next: e.dataset.expectedStepId, sauce: e.dataset.sauceStrokes, cuts: e.dataset.cutCount, heat: e.querySelector('.griddle-slot__heat-ring')?.getAttribute('style') })),
      save: localStorage.getItem('night-market-campaign-v1'), sound: localStorage.getItem(soundKey), hud: document.querySelector('.gameplay-hud')?.textContent,
    }), soundKey)
    const audio = () => page.locator('audio').evaluateAll(els => els.map(a => ({ volume: a.volume, muted: a.muted })))
    const audioBefore = await audio()
    await page.locator('.gameplay-hud__control--pause').tap(); await page.locator('.menu-modal .modal-close').tap()
    await page.locator('[data-platform-input-lock]').waitFor()
    const before = await read(); const lockedAudio = await audio(); const started = Date.now()
    for (const selector of ['[data-ingredient-id="hot-dog"]', '[data-slot-id="left"]', '.serving-tray']) {
      const box = await page.locator(selector).boundingBox(); await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    }
    await dragIngredient(page, 'hot-dog')
    for (const key of ['Escape','h','m','Enter','Space']) await page.keyboard.press(key)
    await page.waitForTimeout(2200)
    const after = await read(); check(JSON.stringify(before) === JSON.stringify(after), 'Ad changed cooking/heat/patience/save/sound/HUD')
    check(lockedAudio.length > 0 && lockedAudio.every(a => a.muted && a.volume === 0), 'BGM not forced mute')
    check(await page.evaluate(() => window.__pokiMockEvents.at(-1)) === 'commercialBreak:start', 'Started before ad resolved')
    await resolveAd(page); const audioAfter = await audio(); check(JSON.stringify(audioAfter) === JSON.stringify(audioBefore), 'Audio settings not restored')
    await page.locator('[data-ingredient-id="hot-dog"]').tap(); await h.waitStep(page, 'sauce')
    await page.waitForTimeout(600); const resumed = await read(); check(JSON.stringify(resumed.patience) !== JSON.stringify(before.patience), 'Timer did not resume')
    return { freezeMs: Date.now() - started, before, after, audioBefore, lockedAudio, audioAfter, inputAndTimerResumed: true }
  })
  for (const day of [1,2,3,4,5,6]) await test('campaign-day-' + day, async () => {
    const { page } = await pageFor(); await seed(page, day, false); await home(page); await start(page, day)
    const ingredients = await page.locator('[data-ingredient-id]').evaluateAll(els => els.map(e => e.dataset.ingredientId))
    check(ingredients.length === [5,8,11,13,15,15][day - 1], 'Incorrect ingredient tray')
    await genericOrder(page)
    if (day === 5) {
      for (let i = 0; i < 3; i++) await genericOrder(page)
      await page.locator('[data-ui-screen="event"]').waitFor(); await english(page, 'Day 5 event')
      check(await page.evaluate(() => window.__pokiMockEvents.at(-1)) === 'gameplayStop', 'Event did not stop gameplay')
      await page.getByRole('button', { name: 'Coming right up!', exact: true }).click()
      await page.locator('[data-customer-id^="celebrity-"].presence-active').waitFor()
      await page.waitForFunction(() => window.__pokiMockEvents.at(-1) === 'gameplayStart')
    }
    return { ingredients, recipeCompleted: true, events: await page.evaluate(() => window.__pokiMockEvents) }
  })
  await test('ad-ready-serve-lock', async () => {
    const { page } = await pageFor({ width: 836, height: 470, touch: true }); await seed(page, 1, false, true); await home(page); await start(page, 1, true)
    await genericOrder(page, false)
    const tray = page.locator('[data-tray-slot-id="left"]'); await tray.waitFor()
    const bounds = await tray.boundingBox()
    const before = await page.evaluate(() => ({ save: localStorage.getItem('night-market-campaign-v1'), served: document.querySelector('.gameplay-hud__orders').textContent }))
    await page.locator('.gameplay-hud__control--pause').tap(); await page.locator('.menu-modal .modal-close').tap()
    await page.locator('[data-platform-input-lock]').waitFor()
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.waitForTimeout(2200)
    check(await tray.count() === 1, 'Ready tray served through ad lock')
    const after = await page.evaluate(() => ({ save: localStorage.getItem('night-market-campaign-v1'), served: document.querySelector('.gameplay-hud__orders').textContent }))
    check(JSON.stringify(before) === JSON.stringify(after), 'Ad served an order or credited income')
    await resolveAd(page); await tray.tap(); await tray.waitFor({state:'hidden'})
    return { before, after, readyServeBlockedMs: 2200, serveResumed: true }
  })
  await test('returning-save-settings-select-rotate', async () => {
    const { page, context } = await pageFor(); await seed(page, 6, false, true); await home(page)
    const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
    await page.getByRole('button', { name: 'Open settings', exact: true }).click(); await english(page, 'Settings')
    await page.screenshot({ path: path.join(out, 'settings.png') })
    // Open a second page without an init script to perform an actual same-context returning load.
    const returning = await context.newPage(); await home(returning)
    returning.on('pageerror', error => report.errors.push({ case: active, message: error.message }))
    await returning.getByRole('button', { name: 'View day progress', exact: true }).click(); await english(returning, 'Day Select')
    await returning.screenshot({ path: path.join(out, 'day-select.png') })
    const days = await returning.locator('button').allTextContents()
    await returning.goto(h.baseUrl); await returning.locator('[data-ui-screen="home"]').waitFor()
    await start(returning, 6)
    const after = await returning.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
    check(JSON.stringify(before) === JSON.stringify(after), 'Campaign save changed on platform reload')
    await returning.setViewportSize({ width: 390, height: 844 }); await returning.locator('.rotate-device').waitFor({ state: 'visible' }); await english(returning, 'Rotate')
    return { before, after, daySelectButtons: days, continueDay: 6 }
  })
  await test('all-production-assets-http', async () => {
    const files = await readdir('dist-poki/assets')
    const failures = []
    for (const file of files) { const response = await fetch(h.baseUrl + '/assets/' + encodeURIComponent(file)); if (!response.ok) failures.push({ file, status: response.status }); await response.arrayBuffer() }
    check(failures.length === 0, JSON.stringify(failures)); return { assetsRequested: files.length, http404: 0 }
  })
  await test('standalone-isolation', async () => {
    const origin = 'http://127.0.0.1:4198'
    const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4198', '--strictPort'], { stdio: 'ignore', windowsHide: true })
    try {
      for (let i = 0; i < 100; i++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r => setTimeout(r, 100)) }
      const { page } = await pageFor({ origin }); await home(page, '?lang=en&playtest=1&debug=1', origin, false)
      check(await page.locator('[data-playtest-debug]').count() === 1, 'Standalone debug behavior lost')
      await start(page, 1, false, false); await page.locator('.gameplay-hud__control--pause').click(); await page.locator('.menu-modal .modal-close').click()
      for (let i = 0; i < 3; i++) await h.completeOrder(page, false)
      await page.locator('[data-ui-screen="summary"]').waitFor(); await page.locator('.summary-actions button:last-child').click()
      await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor()
      check(!await page.evaluate(() => Boolean(window.PokiSDK)), 'Standalone loaded PokiSDK')
      check(!report.requests.some(r => r.case === active && r.request === h.sdkUrl), 'Standalone requested SDK')
      return { debugPreserved: true, startResumeNextDay: true, pokiRequests: 0 }
    } finally { server.kill() }
  })
} finally {
  await browser.close(); h.server.kill()
  report.unexpected = report.requests.filter(r => !r.allowed)
  await writeFile(path.join(out, reportFile), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ cases: report.cases.map(({name,status,error}) => ({ name,status,error })), unexpected: report.unexpected, console: report.console, errors: report.errors, httpErrors: report.httpErrors }, null, 2))
  if (report.cases.some(c => c.status === 'FAIL') || report.unexpected.length || report.errors.length || report.httpErrors.length) process.exitCode = 1
}
