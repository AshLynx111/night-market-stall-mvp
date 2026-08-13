import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'artifacts', 'spatial-alignment-qa')
const origin = 'http://127.0.0.1:53788'
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const expectedIngredientIds = {
  1: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'],
  3: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder', 'turkey-noodle', 'cheese', 'corn'],
  5: ['noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder', 'turkey-noodle', 'cheese', 'corn', 'orleans', 'bacon', 'tenderloin', 'enoki'],
}
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
  schemaVersion: 'spatial-alignment-v1',
  browser: 'Microsoft Edge',
  viewport: { width: 1440, height: 810, deviceScaleFactor: 1 },
  consoleErrors: [],
  pageErrors: [],
  audio: {},
  settings: {},
  screens: {},
  guidedFlow: [],
  griddleGeometry: [],
  kitchenFixtures: {},
  collisions: {
    rackGriddle: [],
    rackTutorial: [],
    crossSlot: [],
    viewportClipping: [],
  },
}

page.on('console', (message) => { if (message.type() === 'error') result.consoleErrors.push(message.text()) })
page.on('pageerror', (error) => result.pageErrors.push(error.message))
await page.addInitScript(() => {
  localStorage.removeItem('night-market-campaign-v1')
  localStorage.removeItem('night-market-guided-tutorial-v2')
  localStorage.removeItem('night-market-audio-settings-v1')
  window.__qaBgmPlayAttempts = 0
  const nativePlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function qaRetryablePlay() {
    window.__qaBgmPlayAttempts += 1
    if (window.__qaBgmPlayAttempts === 1) return Promise.reject(new DOMException('QA initial rejection', 'NotAllowedError'))
    return nativePlay.call(this)
  }
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

async function captureGriddleGeometry(label, expectedStageSlots = []) {
  await waitForImages()
  const record = await page.locator('.kitchen-scene').evaluate((scene, checkpointLabel) => {
    const rect = (node) => {
      if (!node) return null
      const box = node.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }
    }
    const center = (box) => box ? { x: box.x + box.width / 2, y: box.y + box.height / 2 } : null
    const delta = (subject, reference) => subject && reference
      ? { x: center(subject).x - center(reference).x, y: center(subject).y - center(reference).y }
      : null
    const rectDelta = (subject, reference) => subject && reference
      ? {
          x: subject.x - reference.x,
          y: subject.y - reference.y,
          width: subject.width - reference.width,
          height: subject.height - reference.height,
        }
      : null
    const overlap = (a, b) => a && b && a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1
    const slots = ['left', 'right'].map((slotId) => {
      const griddle = rect(scene.querySelector(`[data-griddle-hitbox="${slotId}"]`))
      const inner = rect(scene.querySelector(`[data-slot-id="${slotId}"] [data-griddle-inner-area="${slotId}"]`))
      const stage = rect(scene.querySelector(`[data-slot-id="${slotId}"] .griddle-slot__stage-art`))
      const gesture = rect(scene.querySelector(`[data-gesture-slot-id="${slotId}"]`))
      const tutorial = rect(scene.querySelector(`.tutorial-gesture-cue--${slotId}`))
      return {
        slotId,
        griddle,
        inner,
        stage,
        gesture,
        tutorial,
        stageCenterDelta: delta(stage, griddle),
        innerCenterDelta: delta(inner, griddle),
        gestureRectDelta: rectDelta(gesture, griddle),
        tutorialRectDelta: rectDelta(tutorial, griddle),
      }
    })
    const left = slots[0]
    const right = slots[1]
    const crossSlotCollisions = [
      ...(overlap(left.stage, right.griddle) ? [{ stageSlot: 'left', griddleSlot: 'right' }] : []),
      ...(overlap(right.stage, left.griddle) ? [{ stageSlot: 'right', griddleSlot: 'left' }] : []),
    ]
    return { label: checkpointLabel, slots, crossSlotCollisions }
  }, label)

  for (const slot of record.slots) {
    if (expectedStageSlots.includes(slot.slotId)) {
      assert(slot.stage, `${label}: ${slot.slotId} stage art is absent`)
      assert(Math.abs(slot.stageCenterDelta.x) <= 2 && Math.abs(slot.stageCenterDelta.y) <= 2, `${label}: ${slot.slotId} stage center is misaligned ${JSON.stringify(slot.stageCenterDelta)}`)
      assert(Math.abs(slot.innerCenterDelta.x) <= 2 && Math.abs(slot.innerCenterDelta.y) <= 2, `${label}: ${slot.slotId} food inner center is misaligned ${JSON.stringify(slot.innerCenterDelta)}`)
    }
    for (const [kind, geometry] of [['gesture', slot.gestureRectDelta], ['tutorial', slot.tutorialRectDelta]]) {
      if (!geometry) continue
      assert(Object.values(geometry).every((value) => Math.abs(value) <= 0.5), `${label}: ${slot.slotId} ${kind} geometry diverged ${JSON.stringify(geometry)}`)
    }
  }
  assert(record.crossSlotCollisions.length === 0, `${label}: cross-slot collisions ${JSON.stringify(record.crossSlotCollisions)}`)
  result.collisions.crossSlot.push(...record.crossSlotCollisions.map((collision) => ({ label, ...collision })))
  result.griddleGeometry.push(record)
  return record
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

async function stageCheckpoint(name, expectedStep, slotId) {
  await page.waitForFunction(({ step, id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === step, { step: expectedStep, id: slotId }, { timeout: 12_000 })
  const checkpoint = await page.locator(`[data-slot-id="${slotId}"]`).evaluate((slot, checkpointName) => ({
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
  await captureGriddleGeometry(`guided-${name}`, [slotId])
}

let audioIdentity = null
let previousAudioTime = -1
async function audioCheckpoint(label) {
  await page.waitForTimeout(350)
  const checkpoint = await page.locator('audio[data-game-bgm]').evaluate((audio, checkpointLabel) => {
    if (!audio.__referenceScreensQaIdentity) {
      audio.__referenceScreensQaIdentity = `reference-bgm-${Date.now()}-${Math.random()}`
    }
    return {
      label: checkpointLabel,
      identity: audio.__referenceScreensQaIdentity,
      count: document.querySelectorAll('audio[data-game-bgm]').length,
      currentTime: audio.currentTime,
      loop: audio.loop,
      paused: audio.paused,
      muted: audio.muted,
      volume: audio.volume,
    }
  }, label)
  if (audioIdentity === null) audioIdentity = checkpoint.identity
  assert(checkpoint.identity === audioIdentity, `${label}: BGM element identity changed`)
  assert(checkpoint.count === 1 && checkpoint.loop && !checkpoint.paused && !checkpoint.muted, `${label}: BGM lifecycle invalid ${JSON.stringify(checkpoint)}`)
  assert(checkpoint.currentTime > previousAudioTime, `${label}: BGM time did not strictly increase (${previousAudioTime} -> ${checkpoint.currentTime})`)
  previousAudioTime = checkpoint.currentTime
  result.audio.checkpoints.push(checkpoint)
  return checkpoint
}

async function startClassic(orderNumber, preferredSlotId = null) {
  await page.waitForFunction(() => {
    const boundOrderIds = new Set([...document.querySelectorAll('[data-slot-id][data-order-id]')].map((slot) => slot.dataset.orderId))
    return [...document.querySelectorAll('[data-customer-bubble-for][data-order-id]')]
      .some((bubble) => !boundOrderIds.has(bubble.dataset.orderId))
  }, null, { timeout: 25_000 })
  const emptySlot = preferredSlotId
    ? page.locator(`[data-slot-id="${preferredSlotId}"].phase-empty`)
    : page.locator('[data-slot-id].phase-empty').first()
  await emptySlot.waitFor({ timeout: 8_000 })
  const slotId = await emptySlot.getAttribute('data-slot-id')
  assert(slotId === 'left' || slotId === 'right', `Order ${orderNumber}: no usable griddle slot`)
  await drag('[data-ingredient-id="noodle"]', `[data-slot-id="${slotId}"]`)
  await page.waitForFunction(({ id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === 'egg', { id: slotId }, { timeout: 12_000 })
  return slotId
}

async function finishAndDeliverClassic(orderNumber, slotId, guided = false) {
  const slotSelector = `[data-slot-id="${slotId}"]`
  const gestureSelector = `[data-gesture-slot-id="${slotId}"]`
  if (guided) await stageCheckpoint('noodle', 'egg', slotId)
  await page.locator('[data-ingredient-id="egg"]').click()
  await page.waitForFunction(({ id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === 'hot-dog', { id: slotId }, { timeout: 12_000 })
  if (guided) await stageCheckpoint('egg-ready', 'hot-dog', slotId)
  await drag('[data-ingredient-id="hot-dog"]', slotSelector)
  await page.waitForFunction(({ id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === 'sauce', { id: slotId }, { timeout: 12_000 })
  if (guided) await stageCheckpoint('hot-dog-ready', 'sauce', slotId)
  await page.locator('[data-ingredient-id="sauce"]').click()
  await stroke(gestureSelector, [.15, .44], [.74, .46])
  await page.waitForFunction(({ id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === 'sauce', { id: slotId }, { timeout: 5_000 })
  await stroke(gestureSelector, [.76, .58], [.2, .56])
  result.guidedFlow.push({ name: `actual-sauce-${orderNumber}`, slotId, strokes: 2, directions: ['right', 'left'], realInteraction: true })
  if (guided) await stageCheckpoint('sauce-two-strokes', 'scallion', slotId)
  await drag('[data-ingredient-id="scallion"]', slotSelector)
  if (guided) await stageCheckpoint('scallion', 'cut', slotId)
  for (const ratio of [.3, .5, .7]) await stroke(gestureSelector, [.15, ratio], [.85, ratio])
  if (guided) await stageCheckpoint('three-cuts', 'roll', slotId)
  await stroke(gestureSelector, [.2, .52], [.52, .5])
  await page.waitForFunction(({ id }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === 'pack', { id: slotId }, { timeout: 5_000 })
  result.guidedFlow.push({ name: `actual-roll-${orderNumber}`, slotId, swipes: 1, direction: 'right', realInteraction: true })
  const orderId = await page.locator(slotSelector).getAttribute('data-order-id')
  assert(orderId, `Order ${orderNumber}: griddle has no bound order`)
  const customerId = await page.locator(`[data-customer-bubble-for][data-order-id="${orderId}"]`).getAttribute('data-customer-bubble-for')
  assert(customerId, `Order ${orderNumber}: intended customer bubble missing`)
  await page.locator(`${slotSelector} .griddle-slot__food`).click()
  await page.locator(`[data-tray-slot-id="${slotId}"]`).waitFor()
  await drag(`[data-tray-slot-id="${slotId}"]`, `[data-customer-id="${customerId}"]`)
  if (orderNumber < 3) {
    await page.waitForFunction((count) => document.body.textContent?.includes(`完成订单 ${count}/3`), orderNumber, { timeout: 8_000 })
  }
  result.guidedFlow.push({ name: `actual-delivery-${orderNumber}`, slotId, realInteraction: true })
}

async function makeAndDeliverClassic(orderNumber, guided = false) {
  const slotId = await startClassic(orderNumber)
  await finishAndDeliverClassic(orderNumber, slotId, guided)
}

async function inspectKitchen(day, screenshotName, navigate = true) {
  if (navigate) await page.goto(`${origin}/?playDay=${day}`, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.locator('.kitchen-scene').waitFor()
  await page.waitForTimeout(2_800)
  await waitForImages()
  const record = await page.locator('.kitchen-scene').evaluate((scene) => {
    const rect = (node) => {
      if (!node) return null
      const r = node.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
    }
    const intersect = (a, b) => ({
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      right: Math.min(a.right, b.right),
      bottom: Math.min(a.bottom, b.bottom),
      width: Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)),
      height: Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)),
    })
    const contains = (outer, inner, tolerance = .5) => inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.right <= outer.right + tolerance && inner.bottom <= outer.bottom + tolerance
    const overlap = (a, b) => a.x < b.right - 1 && a.right > b.x + 1 && a.y < b.bottom - 1 && a.bottom > b.y + 1
    const bins = [...scene.querySelectorAll('[data-ingredient-id]')].map((node) => {
      const controlRect = rect(node)
      const viewport = node.querySelector(':scope > .table-ingredient__viewport')
      const image = viewport?.querySelector(':scope > .table-ingredient__food-art')
      const viewportRect = rect(viewport)
      const imageRect = rect(image)
      const visibleFoodRect = viewportRect && imageRect ? intersect(viewportRect, imageRect) : null
      const viewportStyle = viewport ? getComputedStyle(viewport) : null
      const controlStyle = getComputedStyle(node)
      const borderWidth = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']
        .reduce((sum, property) => sum + Number.parseFloat(controlStyle[property] || '0'), 0)
      const hasOuterRimStyle = borderWidth > .5 || controlStyle.backgroundImage !== 'none' || !['rgba(0, 0, 0, 0)', 'transparent'].includes(controlStyle.backgroundColor)
      return {
        id: node.dataset.ingredientId,
        controlRect,
        viewportRect,
        imageRect,
        visibleFoodRect,
        visibleFoodInsideViewport: Boolean(viewportRect && visibleFoodRect && visibleFoodRect.width > 0 && visibleFoodRect.height > 0 && contains(viewportRect, visibleFoodRect)),
        viewportInsideControl: Boolean(viewportRect && contains(controlRect, viewportRect)),
        viewportOverflow: viewportStyle ? `${viewportStyle.overflowX}/${viewportStyle.overflowY}` : '',
        imageExtendsBeyondViewport: Boolean(viewportRect && imageRect && !contains(viewportRect, imageRect)),
        viewportCount: node.querySelectorAll(':scope > .table-ingredient__viewport').length,
        foodArtCount: node.querySelectorAll(':scope > .table-ingredient__viewport > .table-ingredient__food-art').length,
        hasOuterRimStyle,
        image: image ? {
          src: image.getAttribute('src'),
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          opacity: getComputedStyle(image).opacity,
          scale: node.style.getPropertyValue('--ingredient-food-scale'),
          shiftX: node.style.getPropertyValue('--ingredient-food-shift-x'),
          shiftY: node.style.getPropertyValue('--ingredient-food-shift-y'),
        } : null,
      }
    })
    const griddles = [...scene.querySelectorAll('[data-griddle-hitbox]')].map((node) => ({ id: node.dataset.griddleHitbox, rect: rect(node) }))
    const tutorialRect = rect(scene.querySelector('.guided-tutorial'))
    const rackPairs = []
    for (let left = 0; left < bins.length; left += 1) for (let right = left + 1; right < bins.length; right += 1) {
      if (overlap(bins[left].controlRect, bins[right].controlRect)) rackPairs.push([bins[left].id, bins[right].id])
    }
    const customers = [...scene.querySelectorAll('[data-customer-id]')].map((node) => ({ id: node.dataset.customerId, rect: rect(node), phase: node.dataset.customerMotionPhase }))
    const bubbles = [...scene.querySelectorAll('[data-customer-bubble-for]')].map((node) => ({ id: node.dataset.customerBubbleFor, rect: rect(node) }))
    const bubbleFaceCollisions = bubbles.flatMap((bubble) => {
      const actor = customers.find((candidate) => candidate.id === bubble.id)
      if (!actor) return [{ id: bubble.id, missingActor: true }]
      const face = { x: actor.rect.x + actor.rect.width * .28, right: actor.rect.x + actor.rect.width * .72, y: actor.rect.y + actor.rect.height * .25, bottom: actor.rect.y + actor.rect.height * .52 }
      return overlap(bubble.rect, face) ? [{ id: bubble.id, bubble: bubble.rect, face }] : []
    })
    const viewportClippingCollisions = bins.filter((bin) => !bin.visibleFoodInsideViewport || !bin.viewportInsideControl || bin.viewportOverflow !== 'hidden/hidden').map((bin) => bin.id)
    return {
      day: Number(document.querySelector('.game-screen')?.dataset.day),
      ingredientIds: bins.map((bin) => bin.id),
      ingredientCount: bins.length,
      rackLayout: scene.querySelector('[data-rack-layout]')?.dataset.rackLayout ?? '',
      bins,
      legacyBinArtNodeCount: scene.querySelectorAll('.table-ingredient__bin-art').length,
      outerRimIndicatorCount: scene.querySelectorAll('.table-ingredient__vessel,.table-ingredient__contents,[data-outer-rim-indicator]').length + bins.filter((bin) => bin.hasOuterRimStyle).length,
      sauceBrushCount: scene.querySelectorAll('[data-sauce-brush]').length,
      rackPairs,
      rackGriddleCollisions: bins.flatMap((bin) => griddles.filter((griddle) => overlap(bin.controlRect, griddle.rect)).map((griddle) => [bin.id, griddle.id])),
      rackTutorialCollisions: tutorialRect ? bins.filter((bin) => overlap(bin.controlRect, tutorialRect)).map((bin) => bin.id) : [],
      viewportClippingCollisions,
      bakedCustomerCount: scene.querySelectorAll('[data-baked-customer]').length,
      livePlateCount: document.querySelectorAll('[data-kitchen-live-plate]').length,
      bubbleFaceCollisions,
      activeCustomers: customers.filter((customer) => customer.phase === 'active').length,
    }
  })
  const expectedIds = expectedIngredientIds[day]
  assert(record.day === day, `Day fixture identity mismatch: requested ${day}, rendered ${record.day}`)
  assert(JSON.stringify(record.ingredientIds) === JSON.stringify(expectedIds), `Day ${day}: ingredient IDs differ ${JSON.stringify(record.ingredientIds)}`)
  assert(record.ingredientCount === expectedIds.length, `Day ${day}: expected ${expectedIds.length} ingredients, got ${record.ingredientCount}`)
  assert(record.legacyBinArtNodeCount === 0, `Day ${day}: legacy bin-art nodes rendered`)
  assert(record.outerRimIndicatorCount === 0, `Day ${day}: generated outer-rim indicator rendered`)
  assert(record.sauceBrushCount === 0, `Day ${day}: legacy sauce brush rendered`)
  assert(record.bins.every((bin) => bin.viewportCount === 1 && bin.foodArtCount === 1 && bin.image?.naturalWidth > 0 && bin.image?.naturalHeight > 0 && bin.image.opacity !== '0'), `Day ${day}: invalid viewport or food-art structure`)
  assert(record.bins.every((bin) => bin.visibleFoodInsideViewport && bin.viewportInsideControl && bin.imageExtendsBeyondViewport), `Day ${day}: visible food crop escaped its physical viewport`)
  assert(record.rackPairs.length === 0, `Day ${day}: rack slots overlap ${JSON.stringify(record.rackPairs)}`)
  assert(record.rackGriddleCollisions.length === 0, `Day ${day}: rack/griddle collision ${JSON.stringify(record.rackGriddleCollisions)}`)
  assert(record.rackTutorialCollisions.length === 0, `Day ${day}: rack/tutorial collision ${JSON.stringify(record.rackTutorialCollisions)}`)
  assert(record.viewportClippingCollisions.length === 0, `Day ${day}: viewport clipping collision ${JSON.stringify(record.viewportClippingCollisions)}`)
  assert(record.bakedCustomerCount === 0 && record.livePlateCount === 1, `Day ${day}: duplicate baked customer layer`)
  assert(record.bubbleFaceCollisions.length === 0, `Day ${day}: bubble/face collision ${JSON.stringify(record.bubbleFaceCollisions)}`)
  result.collisions.rackGriddle.push(...record.rackGriddleCollisions.map((collision) => ({ day, collision })))
  result.collisions.rackTutorial.push(...record.rackTutorialCollisions.map((ingredientId) => ({ day, ingredientId })))
  result.collisions.viewportClipping.push(...record.viewportClippingCollisions.map((ingredientId) => ({ day, ingredientId })))
  result.kitchenFixtures[`day${day}`] = record
  await screenshot(screenshotName)
  return record
}

try {
  assert(result.schemaVersion === 'spatial-alignment-v1', 'Spatial-alignment result schema is absent')
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 60_000 })
  assert(await page.locator('audio[data-game-bgm]').count() === 0, 'BGM autoplayed before trusted interaction')
  result.screens.home = await screenMetrics('[data-screen-art="home"]')
  assertPlate(result.screens.home, 'home')

  await page.getByRole('button', { name: '打开设置' }).click()
  await page.mouse.click(1200, 700)
  await page.waitForFunction(() => document.querySelector('audio[data-game-bgm]')?.paused === false)
  assert(await page.evaluate(() => window.__qaBgmPlayAttempts >= 2), 'BGM did not retry after initial rejected play')
  await page.getByRole('slider', { name: '总音量' }).fill('0')
  await page.getByRole('slider', { name: '背景音乐音量' }).fill('0.5')
  await page.getByRole('slider', { name: '音效音量' }).fill('1')
  result.settings = await page.locator('.settings-screen__plate').evaluate((plate) => {
    const patch = plate.querySelector('.settings-screen__rail-clean-patch')
    const ranges = [...plate.querySelectorAll('input[type="range"]')].map((slider) => {
      const rect = slider.getBoundingClientRect()
      const value = Number(slider.value)
      const thumbWidth = 28
      const expectedThumbCenterX = rect.left + thumbWidth / 2 + (rect.width - thumbWidth) * value
      const expectedThumbCenterY = rect.top + rect.height / 2
      const style = getComputedStyle(slider)
      return {
        label: slider.getAttribute('aria-label'),
        value,
        dataLevel: slider.dataset.level,
        effectiveCssLevel: style.getPropertyValue('--settings-level').trim(),
        nativeThumbCount: 1,
        nativeThumbVisible: rect.width > thumbWidth && rect.height > 0 && style.display !== 'none' && style.visibility === 'visible' && Number(style.opacity) > 0 && document.elementFromPoint(expectedThumbCenterX, expectedThumbCenterY) === slider,
        expectedThumbCenter: { x: expectedThumbCenterX, y: expectedThumbCenterY },
        rail: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      }
    })
    return {
      patchCount: plate.querySelectorAll('.settings-screen__rail-clean-patch').length,
      patch: patch ? { src: patch.getAttribute('src'), naturalWidth: patch.naturalWidth, naturalHeight: patch.naturalHeight } : null,
      rangeCount: ranges.length,
      decorativeThumbCount: plate.querySelectorAll('.settings-slider__decorative-thumb,[data-decorative-thumb]').length,
      visibleNativeThumbCount: ranges.filter((range) => range.nativeThumbVisible).length,
      ranges,
    }
  })
  assert(result.settings.patchCount === 1 && result.settings.patch?.src.includes('settings-slider-clean-patch.png') && result.settings.patch.naturalWidth > 0 && result.settings.patch.naturalHeight > 0, `Settings localized patch invalid ${JSON.stringify(result.settings.patch)}`)
  assert(result.settings.rangeCount === 3, `Settings expected three ranges, got ${result.settings.rangeCount}`)
  assert(result.settings.decorativeThumbCount === 0, `Settings decorative thumbs rendered: ${result.settings.decorativeThumbCount}`)
  assert(result.settings.visibleNativeThumbCount === 3 && result.settings.ranges.every((range) => range.nativeThumbCount === 1), `Settings native thumbs invalid ${JSON.stringify(result.settings.ranges)}`)
  assert(result.settings.ranges.map((range) => range.effectiveCssLevel).join(',') === '0%,50%,100%', `Settings effective levels invalid ${JSON.stringify(result.settings.ranges)}`)
  result.screens.settings = await screenMetrics('.settings-screen__plate')
  assertPlate(result.screens.settings, 'settings')
  await screenshot('settings')

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
  result.audio = { mixed, muted, sliders: { master: .62, music: .5, effects: .3 }, checkpoints: [] }
  await audioCheckpoint('settings')
  const resumeBefore = await page.locator('audio[data-game-bgm]').evaluate((audio) => { const before = audio.currentTime; audio.pause(); return before })
  await page.mouse.click(1200, 700)
  await page.waitForFunction(() => document.querySelector('audio[data-game-bgm]')?.paused === false)
  const resumeAfter = await page.locator('audio[data-game-bgm]').evaluate((audio) => audio.currentTime)
  assert(resumeAfter >= resumeBefore, `Paused singleton did not resume continuously (${resumeBefore} -> ${resumeAfter})`)
  result.audio.resume = { before: resumeBefore, after: resumeAfter, attempts: await page.evaluate(() => window.__qaBgmPlayAttempts) }
  await page.getByRole('button', { name: '返回主菜单' }).click()
  await page.getByRole('button', { name: '查看关卡与成就' }).click()
  result.screens.select = await screenMetrics('[data-screen-art="select"]')
  assertPlate(result.screens.select, 'select')
  await audioCheckpoint('select')

  await page.getByRole('button', { name: /进入第 1 天/ }).click()
  await page.locator('.kitchen-scene').waitFor()
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 8_000 })
  await page.waitForTimeout(2_800)
  assert(await page.locator('.game-screen').getAttribute('data-day') === '1', 'Selection did not open actual Day 1')
  await inspectKitchen(1, 'day-1-empty', false)
  await audioCheckpoint('day-1-entry')
  await makeAndDeliverClassic(1, true)
  await audioCheckpoint('day-1-after-order-1')
  const secondSlotId = await startClassic(2, 'left')
  const thirdSlotId = await startClassic(3, 'right')
  await captureGriddleGeometry('day-1-two-griddles-populated', ['left', 'right'])
  await screenshot('day-1-two-griddles')
  await finishAndDeliverClassic(2, secondSlotId)
  await audioCheckpoint('day-1-after-order-2')
  await finishAndDeliverClassic(3, thirdSlotId)
  await page.locator('[data-screen-art="summary"]').waitFor({ timeout: 8_000 })
  await audioCheckpoint('summary')
  result.screens.summary = await screenMetrics('[data-screen-art="summary"]')
  assertPlate(result.screens.summary, 'summary')
  const summaryText = await page.locator('.summary-card').innerText()
  assert(summaryText.includes('3') && summaryText.includes('%') && summaryText.includes('¥'), `Summary dynamic values missing: ${summaryText}`)
  await page.getByRole('button', { name: '进入下一天' }).click()
  await page.locator('.game-screen[data-day="2"]').waitFor({ timeout: 8_000 })
  await audioCheckpoint('day-2')

  await inspectKitchen(3, 'day-3')
  await inspectKitchen(5, 'day-5')

  const fixtureKeys = Object.keys(result.kitchenFixtures)
  assert(fixtureKeys.join(',') === 'day1,day3,day5', `Progression fixtures incomplete or out of order: ${fixtureKeys.join(',')}`)
  assert(result.kitchenFixtures.day1.day === 1 && result.kitchenFixtures.day1.ingredientCount === 5, 'Day 1 fixture must record exactly 5 ingredients')
  assert(result.kitchenFixtures.day3.day === 3 && result.kitchenFixtures.day3.ingredientCount === 11, 'Day 3 fixture must record exactly 11 ingredients')
  assert(result.kitchenFixtures.day5.day === 5 && result.kitchenFixtures.day5.ingredientCount === 15, 'Day 5 fixture must record exactly 15 ingredients')
  assert(Object.values(result.collisions).every((collisions) => collisions.length === 0), `Spatial collisions found ${JSON.stringify(result.collisions)}`)
  assert(result.griddleGeometry.some((record) => record.slots.every((slot) => slot.stage && Math.abs(slot.stageCenterDelta.x) <= 2 && Math.abs(slot.stageCenterDelta.y) <= 2)), 'Both griddle stage centers were not accepted together')
  const deliveries = result.guidedFlow.filter((checkpoint) => checkpoint.name.startsWith('actual-delivery-'))
  assert(deliveries.length === 3 && deliveries.every((delivery) => delivery.realInteraction), `Real Day 1 journey incomplete ${JSON.stringify(deliveries)}`)
  const sauceEvidence = result.guidedFlow.find((checkpoint) => checkpoint.name === 'actual-sauce-1')
  const rollEvidence = result.guidedFlow.find((checkpoint) => checkpoint.name === 'actual-roll-1')
  assert(sauceEvidence?.strokes === 2 && sauceEvidence.directions.join(',') === 'right,left', `Two-stroke sauce evidence missing ${JSON.stringify(sauceEvidence)}`)
  assert(rollEvidence?.swipes === 1 && rollEvidence.direction === 'right', `One-swipe rightward roll evidence missing ${JSON.stringify(rollEvidence)}`)

  assert(result.consoleErrors.length === 0, `Console errors: ${JSON.stringify(result.consoleErrors)}`)
  assert(result.pageErrors.length === 0, `Page errors: ${JSON.stringify(result.pageErrors)}`)
  result.passed = true
  await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(`Spatial-alignment Edge QA passed (${Object.keys(result.kitchenFixtures).length} progression fixtures)\n`)
} catch (error) {
  result.passed = false
  result.failure = error instanceof Error ? error.stack : String(error)
  await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`)
  throw error
} finally {
  await browser.close()
  server.kill()
}
