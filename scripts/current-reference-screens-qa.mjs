import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'artifacts', 'reference-screens-qa')
const origin = 'http://127.0.0.1:53788'
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
await mkdir(outputDir, { recursive: true })

const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1', '--port', '53788', '--strictPort',
], { cwd: root, stdio: 'ignore', windowsHide: true })

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
for (let attempt = 0; attempt < 120; attempt += 1) {
  try { if ((await fetch(origin)).ok) break } catch { /* retry */ }
  if (attempt === 119) throw new Error('Vite QA server did not start')
  await delay(100)
}

const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
const result = {
  browser: 'Microsoft Edge',
  viewport: { width: 1440, height: 810, deviceScaleFactor: 1 },
  consoleErrors: [],
  pageErrors: [],
  audio: {},
  screens: {},
  guidedFlow: [],
  kitchenFixtures: {},
}

page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(message.text()) })
page.on('pageerror', (error) => result.pageErrors.push(error.message))
await page.addInitScript(() => {
  localStorage.removeItem('night-market-campaign-v1')
  localStorage.removeItem('night-market-guided-tutorial-v2')
  localStorage.removeItem('night-market-audio-settings-v1')
})

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForImages() {
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), null, { timeout: 45_000 })
}

async function screenshot(name) {
  await waitForImages()
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: false })
}

async function screenMetrics(selector) {
  await waitForImages()
  return page.locator(selector).evaluate((rootElement) => {
    const rect = rootElement.getBoundingClientRect()
    const art = rootElement.querySelector('img')
    const artRect = art?.getBoundingClientRect()
    const dynamic = [...rootElement.querySelectorAll('[data-dynamic-mask]')].map((node) => {
      const box = node.getBoundingClientRect()
      return { text: node.textContent?.trim() ?? '', x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height }
    })
    return {
      rect: { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      art: art && artRect ? { src: art.getAttribute('src'), naturalWidth: art.naturalWidth, naturalHeight: art.naturalHeight, x: artRect.x, y: artRect.y, right: artRect.right, bottom: artRect.bottom } : null,
      dynamic,
      viewport: { width: innerWidth, height: innerHeight },
    }
  })
}

function assertPlate(metrics, name) {
  assert(metrics.art?.naturalWidth > 0, `${name}: missing approved plate`)
  assert(metrics.art.x >= -1 && metrics.art.y >= -1, `${name}: plate clipped at top/left`)
  assert(metrics.art.right <= metrics.viewport.width + 1 && metrics.art.bottom <= metrics.viewport.height + 1, `${name}: plate clipped at bottom/right`)
  assert(metrics.dynamic.every((item) => item.width > 0 && item.height > 0 && item.x >= 0 && item.y >= 0 && item.right <= metrics.viewport.width && item.bottom <= metrics.viewport.height), `${name}: dynamic text is clipped`)
}

async function drag(from, to) {
  const source = await page.locator(from).boundingBox()
  const target = await page.locator(to).boundingBox()
  assert(source && target, `Missing drag target ${from} -> ${to}`)
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 })
  await page.mouse.up()
}

async function stroke(selector, from, to) {
  const box = await page.locator(selector).boundingBox()
  assert(box, `Missing gesture target ${selector}`)
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}

async function stageCheckpoint(name, expectedStep) {
  await page.waitForFunction((step) => document.querySelector('[data-slot-id="left"]')?.dataset.expectedStepId === step, expectedStep, { timeout: 12_000 })
  const checkpoint = await page.locator('[data-slot-id="left"]').evaluate((slot, checkpointName) => ({
    name: checkpointName,
    expectedStep: slot.dataset.expectedStepId,
    phase: [...slot.classList].find((className) => className.startsWith('phase-')),
    stageImages: slot.querySelectorAll('.griddle-slot__stage-art').length,
    foodImages: slot.querySelectorAll('.griddle-slot__food img').length,
    overlays: slot.querySelectorAll('[data-modifier-overlay]').length,
    stageSrc: slot.querySelector('.griddle-slot__stage-art')?.getAttribute('src') ?? '',
  }), name)
  assert(checkpoint.stageImages === 1 && checkpoint.foodImages === 1 && checkpoint.overlays === 0, `Non-cumulative stage at ${name}`)
  result.guidedFlow.push(checkpoint)
}

async function inspectKitchen(day) {
  await page.goto(`${origin}/?playDay=${day}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.locator('.kitchen-scene').waitFor()
  await page.waitForTimeout(2_800)
  await waitForImages()
  const record = await page.locator('.kitchen-scene').evaluate((scene) => {
    const rect = (node) => {
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const overlap = (a, b) => a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1
    const bins = [...scene.querySelectorAll('[data-ingredient-id]')].map((node) => ({
      id: node.dataset.ingredientId,
      rect: rect(node),
      completeBinImages: node.querySelectorAll(':scope > img.table-ingredient__bin-art').length,
      legacyVessels: node.querySelectorAll('.table-ingredient__vessel,.table-ingredient__contents').length,
      image: (() => { const image = node.querySelector(':scope > img.table-ingredient__bin-art'); return image ? { src: image.getAttribute('src'), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, opacity: getComputedStyle(image).opacity } : null })(),
    }))
    const griddles = [...scene.querySelectorAll('[data-griddle-hitbox]')].map((node) => ({ id: node.dataset.griddleHitbox, rect: rect(node) }))
    const tutorial = scene.querySelector('.guided-tutorial')
    const tutorialRect = tutorial ? rect(tutorial) : null
    const binPairs = []
    for (let left = 0; left < bins.length; left += 1) for (let right = left + 1; right < bins.length; right += 1) {
      if (overlap(bins[left].rect, bins[right].rect)) binPairs.push([bins[left].id, bins[right].id])
    }
    const customers = [...scene.querySelectorAll('[data-customer-id]')].map((node) => ({ id: node.dataset.customerId, rect: rect(node), phase: node.dataset.customerMotionPhase }))
    const bubbles = [...scene.querySelectorAll('[data-customer-bubble-for]')].map((node) => ({ id: node.dataset.customerBubbleFor, rect: rect(node) }))
    const bubbleFaceCollisions = bubbles.flatMap((bubble) => {
      const actor = customers.find((candidate) => candidate.id === bubble.id)
      if (!actor) return [{ id: bubble.id, missingActor: true }]
      const face = { x: actor.rect.x + actor.rect.width * .28, right: actor.rect.x + actor.rect.width * .72, y: actor.rect.y + actor.rect.height * .25, bottom: actor.rect.y + actor.rect.height * .52 }
      return overlap(bubble.rect, face) ? [{ id: bubble.id, bubble: bubble.rect, face }] : []
    })
    return {
      day: Number(document.querySelector('.game-screen')?.dataset.day),
      bins,
      sauceBrushCount: scene.querySelectorAll('[data-sauce-brush]').length,
      floatingBareIngredientImages: scene.querySelectorAll('.table-ingredient:not(:has(> img.table-ingredient__bin-art))').length,
      binPairs,
      binGriddleOverlaps: bins.flatMap((bin) => griddles.filter((griddle) => overlap(bin.rect, griddle.rect)).map((griddle) => [bin.id, griddle.id])),
      binTutorialOverlaps: tutorialRect ? bins.filter((bin) => overlap(bin.rect, tutorialRect)).map((bin) => bin.id) : [],
      bakedCustomerCount: scene.querySelectorAll('[data-baked-customer]').length,
      livePlateCount: document.querySelectorAll('[data-kitchen-live-plate]').length,
      bubbleFaceCollisions,
      activeCustomers: customers.filter((customer) => customer.phase === 'active').length,
    }
  })
  const expectedBins = day <= 1 ? 4 : day === 3 ? 10 : 14
  assert(record.bins.length === expectedBins, `Day ${day}: expected ${expectedBins} complete bins, got ${record.bins.length}`)
  assert(record.sauceBrushCount === 1, `Day ${day}: sauce brush missing`)
  assert(record.floatingBareIngredientImages === 0, `Day ${day}: floating ingredient found`)
  assert(record.bins.every((bin) => bin.completeBinImages === 1 && bin.legacyVessels === 0 && bin.image?.naturalWidth > 0 && bin.image?.naturalHeight > 0 && bin.image.opacity !== '0'), `Day ${day}: incomplete or empty rendered bin`)
  assert(record.binPairs.length === 0, `Day ${day}: bins overlap ${JSON.stringify(record.binPairs)}`)
  assert(record.binGriddleOverlaps.length === 0, `Day ${day}: bin/griddle overlap ${JSON.stringify(record.binGriddleOverlaps)}`)
  assert(record.binTutorialOverlaps.length === 0, `Day ${day}: bin/tutorial overlap ${JSON.stringify(record.binTutorialOverlaps)}`)
  assert(record.bakedCustomerCount === 0 && record.livePlateCount === 1, `Day ${day}: duplicate baked customer layer`)
  assert(record.bubbleFaceCollisions.length === 0, `Day ${day}: bubble/face collision ${JSON.stringify(record.bubbleFaceCollisions)}`)
  await screenshot(`0${day === 3 ? 7 : 8}-day-${day}-all-unlocked-bins`)
  result.kitchenFixtures[`day${day}`] = record
}

try {
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 60_000 })
  assert(await page.locator('audio[data-game-bgm]').count() === 0, 'BGM autoplayed before trusted interaction')
  result.screens.home = await screenMetrics('[data-screen-art="home"]')
  assertPlate(result.screens.home, 'home')
  await screenshot('01-home')

  await page.getByRole('button', { name: '打开设置' }).click()
  await page.waitForFunction(() => document.querySelector('audio[data-game-bgm]')?.paused === false)
  await page.getByRole('slider', { name: '总音量' }).fill('0.62')
  await page.getByRole('slider', { name: '背景音乐音量' }).fill('0.5')
  await page.getByRole('slider', { name: '音效音量' }).fill('0.3')
  const mixed = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ loop: audio.loop, paused: audio.paused, muted: audio.muted, volume: audio.volume }))
  assert(mixed.loop && !mixed.paused && !mixed.muted && Math.abs(mixed.volume - .31) < .002, `Settings did not apply to BGM ${JSON.stringify(mixed)}`)
  await page.getByRole('button', { name: '背景音乐' }).click()
  const muted = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ muted: audio.muted, volume: audio.volume }))
  assert(muted.muted && muted.volume === 0, `Mute did not apply ${JSON.stringify(muted)}`)
  await page.getByRole('button', { name: '背景音乐' }).click()
  await page.locator('audio[data-game-bgm]').evaluate((audio) => { audio.currentTime = 7 })
  result.screens.settings = await screenMetrics('.settings-screen__plate')
  assertPlate(result.screens.settings, 'settings')
  await screenshot('02-settings-audio-controls')
  await page.getByRole('button', { name: '返回主菜单' }).click()
  await page.getByRole('button', { name: '查看关卡与成就' }).click()
  result.screens.select = await screenMetrics('[data-screen-art="select"]')
  assertPlate(result.screens.select, 'select')
  const afterNavigation = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ count: document.querySelectorAll('audio[data-game-bgm]').length, paused: audio.paused, muted: audio.muted, volume: audio.volume, currentTime: audio.currentTime }))
  assert(afterNavigation.count === 1 && !afterNavigation.paused && !afterNavigation.muted && afterNavigation.currentTime >= 7, `BGM did not persist across screens ${JSON.stringify(afterNavigation)}`)
  result.audio = { mixed, muted, afterNavigation, sliders: { master: .62, music: .5, effects: .3 } }
  await screenshot('03-day-select')

  await page.getByRole('button', { name: /进入第 1 天/ }).click()
  await page.locator('.kitchen-scene').waitFor()
  assert(await page.locator('audio[data-game-bgm]').count() === 1, 'Day transition duplicated BGM element')

  // Dev-only fixture preserves the complete tutorial but pre-credits two orders,
  // so a real first-order gesture journey reaches the real summary deterministically.
  await page.goto(`${origin}/?playDay=1&qaServedOrders=2`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 8_000 })
  await page.waitForTimeout(2_800)
  await screenshot('04-day-1-guided-entry')
  await drag('[data-ingredient-id="noodle"]', '[data-slot-id="left"]')
  await stageCheckpoint('noodle', 'egg')
  await drag('[data-ingredient-id="egg"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="hot-dog"]').waitFor({ timeout: 10_000 })
  await stageCheckpoint('egg-ready', 'hot-dog')
  await drag('[data-ingredient-id="hot-dog"]', '[data-slot-id="left"]')
  await page.locator('[data-tutorial-step="sauce"]').waitFor({ timeout: 10_000 })
  await stageCheckpoint('hot-dog-ready', 'sauce')
  await page.locator('[data-sauce-brush]').click()
  await stroke('[data-gesture-slot-id="left"]', [.15, .44], [.74, .46])
  await stroke('[data-gesture-slot-id="left"]', [.76, .58], [.2, .56])
  await stageCheckpoint('sauce-two-strokes', 'scallion')
  await drag('[data-ingredient-id="scallion"]', '[data-slot-id="left"]')
  await stageCheckpoint('scallion', 'cut')
  for (const ratio of [.3, .5, .7]) await stroke('[data-gesture-slot-id="left"]', [.15, ratio], [.85, ratio])
  await stageCheckpoint('three-cuts', 'roll')
  await stroke('[data-gesture-slot-id="left"]', [.2, .52], [.52, .5])
  await page.locator('[data-tutorial-step="pack"]').waitFor({ timeout: 5_000 })
  await page.locator('[data-slot-id="left"] .griddle-slot__food').click()
  await page.locator('[data-tray-slot-id="left"]').waitFor()
  await drag('[data-tray-slot-id="left"]', '[data-customer-id].presence-active')
  await page.locator('[data-screen-art="summary"]').waitFor({ timeout: 8_000 })
  result.screens.summary = await screenMetrics('[data-screen-art="summary"]')
  assertPlate(result.screens.summary, 'summary')
  const summaryText = await page.locator('.summary-card').innerText()
  assert(summaryText.includes('3') && summaryText.includes('%') && summaryText.includes('¥'), `Summary dynamic values missing: ${summaryText}`)
  await screenshot('05-day-1-summary')
  await page.getByRole('button', { name: '进入下一天' }).click()
  await page.getByRole('button', { name: '返回主页' }).getByText('第 2 天').waitFor({ timeout: 8_000 })
  await screenshot('06-next-day')

  await inspectKitchen(3)
  await inspectKitchen(5)

  assert(result.consoleErrors.length === 0, `Console errors: ${JSON.stringify(result.consoleErrors)}`)
  assert(result.pageErrors.length === 0, `Page errors: ${JSON.stringify(result.pageErrors)}`)
  result.passed = true
  await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`Reference-screen Edge QA passed (${Object.keys(result.kitchenFixtures).length} progression fixtures)\n`)
} catch (error) {
  result.passed = false
  result.failure = error instanceof Error ? error.stack : String(error)
  await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  throw error
} finally {
  await browser.close()
  server.kill()
}
