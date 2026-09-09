import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const outputDir = path.resolve(process.env.TRAY_QA_OUTPUT || 'docs/qa/screenshots/ingredient-tray-all-days')
const days = process.env.TRAY_QA_DAYS ? process.env.TRAY_QA_DAYS.split(',').map(Number) : [1, 2, 3, 4, 5, 6]
const viewports = process.env.TRAY_QA_QUICK ? [[1440, 810]] : [[1440, 810], [844, 390], [836, 470], [640, 360]]
const counts = [5, 8, 11, 13, 15, 15]
const ids = ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder', 'turkey-noodle', 'cheese', 'corn', 'orleans', 'bacon', 'tenderloin', 'enoki']
const boundsSource = await readFile('src/landscape/kitchen/ingredientVisualBounds.ts', 'utf8')
const bounds = JSON.parse(boundsSource.slice(boundsSource.indexOf(' = ') + 3, boundsSource.indexOf(' satisfies')))
const baseline = JSON.parse(await readFile('docs/qa/screenshots/ingredient-tray/qa-results.json', 'utf8'))
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const results = { build: 'poki-production', locale: 'en', sdk: 'network mock; game code is production', captures: [], errors: [], maxLogicalDrift: 0, maxBaselineDrift: 0 }

async function openGameplay(browser, url, day, width, height, dpr = 1, guided = false) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: width < 1000, hasTouch: width < 1000 })
  const page = await context.newPage()
  page.on('pageerror', error => results.errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()) })
  await page.route('https://game-cdn.poki.com/scripts/v2/poki-sdk.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__pokiLoaded=false; window.PokiSDK={init:async()=>{},gameLoadingFinished:()=>window.__pokiLoaded=true,gameplayStart:()=>{},gameplayStop:()=>{},commercialBreak:async()=>{}};' }))
  await page.addInitScript(({ day, guided }) => {
    localStorage.clear(); sessionStorage.clear()
    localStorage.setItem('night-market-locale-v1', 'zh-CN')
    localStorage.setItem('night-market-guided-tutorial-v2', String(!guided))
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({ coins: 360, fireLevel: 0, signLevel: 0, bestStars: Object.fromEntries(Array.from({ length: day - 1 }, (_, i) => [i + 1, 3])), maxUnlockedDay: day }))
  }, { day, guided })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__pokiLoaded)
  await page.getByRole('button', { name: day === 1 ? 'Start Game' : 'Continue', exact: true }).click()
  await page.locator('[data-ui-screen="playing"]').waitFor()
  await page.waitForFunction(guided => document.querySelectorAll('.kitchen-customer__actor.presence-active').length >= (guided ? 1 : 3), guided)
  return { context, page }
}

async function inspect(page) {
  return page.evaluate(() => {
    const logical = document.querySelector('.game-screen__logical').getBoundingClientRect()
    const scale = logical.width / 1440
    const rect = node => {
      const r = node.getBoundingClientRect()
      return { left: (r.left - logical.left) / scale, top: (r.top - logical.top) / scale, width: r.width / scale, height: r.height / scale }
    }
    const plate = document.querySelector('.kitchen-scene__ingredient-rack-plate')
    const rack = document.querySelector('[data-rack-layout]')
    return {
      lang: document.documentElement.lang,
      day: Number(document.querySelector('[data-day]').dataset.day),
      layout: rack.dataset.rackLayout,
      backgroundLayout: document.querySelector('[data-kitchen-rack-background]').dataset.kitchenRackBackground,
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
      plate: { loaded: plate.naturalWidth > 0, src: plate.currentSrc.split('/').at(-1), z: Number(getComputedStyle(plate).zIndex), foregroundZ: Number(getComputedStyle(document.querySelector('.kitchen-scene__counter-foreground')).zIndex) },
      ingredients: [...rack.querySelectorAll('[data-ingredient-id]')].map(control => {
        const label = control.querySelector('.table-ingredient__label')
        const viewport = control.querySelector('.table-ingredient__viewport')
        const l = label.getBoundingClientRect()
        const style = getComputedStyle(label)
        return {
          id: control.dataset.ingredientId, index: Number(control.dataset.rackIndex),
          image: rect(control.querySelector('.table-ingredient__food-art')), label: rect(label), mask: rect(viewport), control: rect(control),
          labelClipped: label.scrollWidth > label.clientWidth + 1,
          labelHit: document.elementFromPoint(l.left + l.width / 2, l.top + l.height / 2)?.closest('[data-ingredient-id]')?.getAttribute('data-ingredient-id'),
          text: label.textContent, labelStyle: { fontSize: style.fontSize, padding: style.padding, background: style.backgroundColor, color: style.color },
          contact: getComputedStyle(viewport, '::before').backgroundImage, inset: getComputedStyle(viewport, '::after').boxShadow,
        }
      }),
      activeGriddles: document.querySelectorAll('.griddle-slot__stage-art').length,
      guided: document.querySelector('.kitchen-scene').dataset.guidedTutorial === 'true',
      celebrity: Boolean(document.querySelector('[data-customer-id^="celebrity-"]')),
      trayClip: { x: Math.max(0, logical.left), y: logical.top + 460 * scale, width: 420 * scale, height: 305 * scale },
    }
  })
}

function validate(record) {
  const { day, ingredients, plate } = record
  assert(record.lang === 'en', 'Production did not enforce English')
  assert(!record.overflow, `Day ${day}: viewport overflow`)
  assert(record.layout === (day === 1 ? 'approved-2x3' : 'expanded-3x5'), `Day ${day}: wrong variant`)
  assert(record.backgroundLayout === record.layout, `Day ${day}: background and tray diverged`)
  assert(plate.loaded && plate.z > plate.foregroundZ, `Day ${day}: plate obscured`)
  assert(plate.src.includes(day === 1 ? 'kitchen-screen-live-clean-' : 'kitchen-screen-live-expanded-clean-'), `Day ${day}: wrong metal plate`)
  assert(ingredients.length === counts[day - 1], `Day ${day}: wrong ingredient count`)
  assert(JSON.stringify(ingredients.map(i => i.id)) === JSON.stringify(ids.slice(0, counts[day - 1])), `Day ${day}: wrong ingredients`)
  for (const i of ingredients) {
    const a = bounds[i.id]
    const food = { left: i.image.left + a.bounds.left / a.sourceWidth * i.image.width, top: i.image.top + a.bounds.top / a.sourceHeight * i.image.height, width: a.bounds.width / a.sourceWidth * i.image.width, height: a.bounds.height / a.sourceHeight * i.image.height }
    assert(food.left >= i.mask.left - .05 && food.top >= i.mask.top - .05 && food.left + food.width <= i.mask.left + i.mask.width + .05 && food.top + food.height <= i.mask.top + i.mask.height + .05, `Day ${day} ${i.id}: clipped food`)
    assert(i.label.top >= food.top + food.height - .05, `Day ${day} ${i.id}: label overlaps food`)
    assert(!i.labelClipped && i.labelHit === i.id, `Day ${day} ${i.id}: label clipping/target regression`)
    assert(i.contact.includes('radial-gradient') && i.inset !== 'none', `Day ${day} ${i.id}: missing seating treatment`)
    i.food = food
  }
}

function compareGeometry(record, reference) {
  let max = 0
  for (const i of record.ingredients) {
    const expected = reference.ingredients.find(e => e.id === i.id)
    if (!expected) continue
    for (const layer of ['image', 'label', 'control']) for (const key of ['left', 'top', 'width', 'height']) max = Math.max(max, Math.abs(i[layer][key] - expected[layer][key]))
    if (expected.labelStyle) assert(JSON.stringify(i.labelStyle) === JSON.stringify(expected.labelStyle), `Label style differs: ${i.id}`)
  }
  assert(max < .12, `${record.scenario} Day ${record.day} ${record.width}: placement drift ${max}`)
  return max
}

async function capture(page, day, scenario = 'gameplay', closeup = false) {
  const { width, height } = page.viewportSize()
  await page.mouse.move(width - 2, height - 2)
  // Move keyboard focus away without changing game state or hiding artwork.
  await page.evaluate(async () => { document.activeElement?.blur?.(); await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())) })
  const diagnostic = await inspect(page)
  assert(diagnostic.day === day, `Requested Day ${day}, opened ${diagnostic.day}`)
  const record = { scenario, width, height, closeup, ...diagnostic }
  validate(record)
  const stem = `day-${day}-${scenario}-${width}x${height}`
  const trayScreenshot = closeup ? `day-${day}-tray-closeup.png` : `${stem}-tray.png`
  const screenshot = closeup ? null : `${stem}.png`
  if (screenshot) await page.screenshot({ path: path.join(outputDir, screenshot) })
  await page.screenshot({ path: path.join(outputDir, trayScreenshot), clip: diagnostic.trayClip })
  const old = baseline.captures.find(c => Number(c.day) === day && c.width === width && c.height === height && c.dpr === 1)
  if (old) results.maxBaselineDrift = Math.max(results.maxBaselineDrift, compareGeometry(record, old))
  const common = results.captures.find(c => c.layout === record.layout && c.day >= record.day && c.scenario === 'gameplay')
  if (common) results.maxLogicalDrift = Math.max(results.maxLogicalDrift, compareGeometry(record, common))
  results.captures.push({ ...record, screenshot, trayScreenshot })
  console.log(`Captured Day ${day} ${scenario} ${width}x${height}${closeup ? ' DPR3' : ''}`)
}

async function fillBothGriddles(page) {
  const noodle = page.locator('[data-ingredient-id="noodle"]')
  await noodle.press('Enter')
  await page.locator('[data-slot-id="left"] .griddle-slot__stage-art').waitFor()
  await noodle.press('Enter')
  await page.locator('[data-slot-id="right"] .griddle-slot__stage-art').waitFor()
}

async function serveOrder(page) {
  const slot = page.locator('[data-slot-id="left"]')
  await slot.locator('.griddle-slot__stage-art').waitFor({ state: 'hidden' })
  await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length >= 1)
  await page.locator('[data-ingredient-id="noodle"]').press('Enter')
  await slot.locator('.griddle-slot__stage-art').waitFor()
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    const step = await slot.getAttribute('data-expected-step-id')
    if (step === 'pack') {
      await slot.locator('.griddle-slot__food').press('Enter')
      await page.locator('[data-tray-slot-id="left"]').press('Enter')
      await page.locator('[data-tray-slot-id="left"]').waitFor({ state: 'hidden' })
      return
    }
    if (step === 'sauce') await page.locator('[data-ingredient-id="sauce"]').press('Enter')
    if (['sauce', 'cut', 'roll'].includes(step)) {
      await page.locator('[data-gesture-slot-id="left"]').press('Enter')
    } else if (step) {
      const ingredient = step === 'second-noodle' ? 'noodle' : step === 'second-egg' ? 'egg' : step
      await page.locator(`[data-ingredient-id="${ingredient}"]`).press('Enter')
    }
    await page.waitForTimeout(80)
  }
  throw new Error(`Could not serve order; next step ${await slot.getAttribute('data-expected-step-id')}`)
}

async function createReviewSheets() {
  for (const day of days) {
    const captures = results.captures.filter(c => c.day === day && c.scenario === 'gameplay' && !c.closeup)
    const tiles = []
    for (const [index, capture] of captures.entries()) {
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="840" height="32"><rect width="840" height="32" fill="#211b17"/><text x="12" y="22" fill="#f2dfbc" font-family="Arial" font-size="18">Day ${day} · ${capture.width}x${capture.height} · ${capture.ingredients.length} foods · Poki English</text></svg>`)
      tiles.push({ input: label, left: index % 2 * 840, top: Math.floor(index / 2) * 642 })
      tiles.push({ input: await sharp(path.join(outputDir, capture.trayScreenshot)).resize(840, 610).png().toBuffer(), left: index % 2 * 840, top: Math.floor(index / 2) * 642 + 32 })
    }
    await sharp({ create: { width: 1680, height: Math.ceil(captures.length / 2) * 642, channels: 4, background: '#211b17' } }).composite(tiles).png().toFile(path.join(outputDir, `day-${day}-tray-size-review.png`))
  }
}

const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const url = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'poki', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  await mkdir(outputDir, { recursive: true })
  for (let i = 0; i < 200; i++) {
    try { if ((await fetch(url)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
  for (const day of days) {
    for (const [width, height] of viewports) {
      const { context, page } = await openGameplay(browser, url, day, width, height)
      await capture(page, day)
      const art = page.locator('[data-ingredient-id="noodle"] .table-ingredient__food-art')
      const before = await art.boundingBox()
      await page.locator('[data-ingredient-id="noodle"]').hover()
      await page.waitForTimeout(150)
      const after = await art.boundingBox()
      assert(['x','y','width','height'].every(k => Math.abs(before[k] - after[k]) < .1), 'Hover lifted food')
      if (width === 1440) { await fillBothGriddles(page); await capture(page, day, 'dual-griddles') }
      await context.close()
    }
    const { context, page } = await openGameplay(browser, url, day, 1440, 810, 3)
    await capture(page, day, 'gameplay', true)
    await context.close()
  }
  if (days.includes(1)) for (const [width, height] of viewports) {
    const { context, page } = await openGameplay(browser, url, 1, width, height, 1, true)
    await capture(page, 1, 'guided-tutorial')
    await context.close()
  }
  if (days.includes(5)) {
    const { context, page } = await openGameplay(browser, url, 5, 1440, 810)
    for (let order = 1; order <= 4; order++) { console.log(`Day 5 event setup: serving order ${order}`); await serveOrder(page) }
    await page.locator('[data-ui-screen="event"]').waitFor()
    await page.screenshot({ path: path.join(outputDir, 'day-5-event-entry.png') })
    await page.getByRole('button', { name: 'Coming right up!', exact: true }).click()
    await page.locator('[data-ui-screen="playing"]').waitFor()
    await page.locator('[data-customer-id^="celebrity-"].presence-active').waitFor()
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height })
      await capture(page, 5, 'celebrity-return')
    }
    await context.close()
  }
  // Compare every state/size and all partial expanded menus against the full rack.
  for (const c of results.captures) {
    const reference = results.captures.find(r => r.layout === c.layout && r.scenario === 'gameplay' && r.width === 1440 && r.ingredients.length === (c.day === 1 ? 5 : 15) && !r.closeup)
      ?? results.captures.find(r => r.day === c.day && r.scenario === 'gameplay' && r.width === 1440 && !r.closeup)
    results.maxLogicalDrift = Math.max(results.maxLogicalDrift, compareGeometry(c, reference))
  }
  assert(results.errors.length === 0, results.errors.join('\n'))
  await createReviewSheets()
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify({ captures: results.captures.length, maxLogicalDrift: results.maxLogicalDrift, maxBaselineDrift: results.maxBaselineDrift, errors: results.errors, outputDir }))
} finally {
  await browser?.close()
  server.kill()
}
