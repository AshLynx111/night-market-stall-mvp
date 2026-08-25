import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4189
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'summary-upgrade-icons-v1')
const screenshotPath = path.join(outputDir, 'summary-upgrade-icons-1440x810.png')
const baselinePath = path.join(root, 'docs', 'qa', 'screenshots', 'day-retention-loop-v1', 'summary-next-day-1440x810.png')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
await mkdir(outputDir, { recursive: true })

const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })

let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function waitForServer() {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Production preview did not start:\n${serverLog}`)
}

async function waitForImages(page) {
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 120_000 },
  )
}

async function stroke(page, selector, from, to) {
  const box = await page.locator(selector).boundingBox()
  assert(box, `Missing gesture target: ${selector}`)
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}

async function drag(page, from, to) {
  const source = await page.locator(from).boundingBox()
  const target = await page.locator(to).boundingBox()
  assert(source && target, `Missing drag target: ${from} -> ${to}`)
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 })
  await page.mouse.up()
}

async function waitForExpectedStep(page, slotId, step, timeout = 12_000) {
  await page.waitForFunction(
    ({ id, expected }) => document.querySelector(`[data-slot-id="${id}"]`)?.dataset.expectedStepId === expected,
    { id: slotId, expected: step },
    { timeout },
  )
}

async function startClassic(page, orderNumber) {
  await page.waitForFunction(() => {
    const boundOrderIds = new Set(
      [...document.querySelectorAll('[data-slot-id][data-order-id]')].map((slot) => slot.dataset.orderId),
    )
    return [...document.querySelectorAll('[data-customer-bubble-for][data-order-id]')]
      .some((bubble) => !boundOrderIds.has(bubble.dataset.orderId))
  }, null, { timeout: 25_000 })

  const emptySlot = page.locator('[data-slot-id].phase-empty').first()
  await emptySlot.waitFor({ timeout: 8_000 })
  const slotId = await emptySlot.getAttribute('data-slot-id')
  assert(slotId === 'left' || slotId === 'right', `Order ${orderNumber}: no usable griddle slot`)
  await drag(page, '[data-ingredient-id="noodle"]', `[data-slot-id="${slotId}"]`)
  await waitForExpectedStep(page, slotId, 'egg')
  return slotId
}

async function finishAndDeliverClassic(page, orderNumber, slotId) {
  const slotSelector = `[data-slot-id="${slotId}"]`
  const gestureSelector = `[data-gesture-slot-id="${slotId}"]`
  await page.locator('[data-ingredient-id="egg"]').click()
  await waitForExpectedStep(page, slotId, 'hot-dog')
  await drag(page, '[data-ingredient-id="hot-dog"]', slotSelector)
  await waitForExpectedStep(page, slotId, 'sauce')
  await page.locator('[data-ingredient-id="sauce"]').click()
  await stroke(page, gestureSelector, [.15, .44], [.74, .46])
  await waitForExpectedStep(page, slotId, 'sauce', 5_000)
  await stroke(page, gestureSelector, [.76, .58], [.2, .56])
  await waitForExpectedStep(page, slotId, 'scallion')
  await drag(page, '[data-ingredient-id="scallion"]', slotSelector)
  await waitForExpectedStep(page, slotId, 'cut')
  for (const ratio of [.3, .5, .7]) await stroke(page, gestureSelector, [.15, ratio], [.85, ratio])
  await waitForExpectedStep(page, slotId, 'roll')
  await stroke(page, gestureSelector, [.2, .52], [.52, .5])
  await waitForExpectedStep(page, slotId, 'pack', 5_000)

  const orderId = await page.locator(slotSelector).getAttribute('data-order-id')
  assert(orderId, `Order ${orderNumber}: griddle has no bound order`)
  const customerId = await page.locator(`[data-customer-bubble-for][data-order-id="${orderId}"]`)
    .getAttribute('data-customer-bubble-for')
  assert(customerId, `Order ${orderNumber}: intended customer is missing`)
  await page.locator(`${slotSelector} .griddle-slot__food`).click()
  await page.locator(`[data-tray-slot-id="${slotId}"]`).waitFor()
  await drag(page, `[data-tray-slot-id="${slotId}"]`, `[data-customer-id="${customerId}"]`)
}

async function makeAndDeliverClassic(page, orderNumber) {
  const slotId = await startClassic(page, orderNumber)
  await finishAndDeliverClassic(page, orderNumber, slotId)
}

function roundedBox(box) {
  return Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value * 10) / 10]))
}

function within(value, expected, tolerance = 1.5) {
  return Math.abs(value - expected) <= tolerance
}

async function pixelDifference() {
  const [{ data: before, info }, { data: after, info: afterInfo }] = await Promise.all([
    sharp(baselinePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(screenshotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  assert(info.width === afterInfo.width && info.height === afterInfo.height && info.channels === afterInfo.channels, 'Baseline and QA screenshots differ in shape')
  const masks = [
    { name: 'funds', x: 305, y: 495, width: 120, height: 105 },
    { name: 'fire', x: 565, y: 495, width: 105, height: 105 },
    { name: 'sign', x: 860, y: 495, width: 110, height: 105 },
  ]
  const changedByMask = Object.fromEntries(masks.map(({ name }) => [name, 0]))
  let changedOutside = 0
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels
      let delta = 0
      for (let channel = 0; channel < info.channels; channel += 1) {
        delta = Math.max(delta, Math.abs(before[offset + channel] - after[offset + channel]))
      }
      if (delta < 24) continue
      const mask = masks.find((candidate) => x >= candidate.x && x < candidate.x + candidate.width && y >= candidate.y && y < candidate.y + candidate.height)
      if (mask) changedByMask[mask.name] += 1
      else changedOutside += 1
    }
  }
  return { threshold: 24, changedPixelsByIconRegion: changedByMask, changedPixelsOutsideIconRegions: changedOutside }
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const results = {
  capturedAt: new Date().toISOString(),
  browser: { name: 'Microsoft Edge', version: browser.version() },
  viewport: { width: 1440, height: 810, deviceScaleFactor: 1 },
  baseline: path.relative(root, baselinePath).replaceAll('\\', '/'),
  screenshot: path.relative(root, screenshotPath).replaceAll('\\', '/'),
  summaryReachedByThreeRealOrders: false,
  icons: [],
  layout: {},
  comparison: {},
  allImagesDecoded: false,
  consoleErrors: [],
  pageErrors: [],
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => results.pageErrors.push(error.message))
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
    localStorage.removeItem('night-market-audio-settings-v1')
  })

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="home"]').waitFor({ timeout: 120_000 })
  await page.getByRole('button', { name: '开始游戏' }).click()
  await page.locator('[data-ui-screen="playing"][data-day="1"]').waitFor({ timeout: 120_000 })
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 20_000 })
  for (let orderNumber = 1; orderNumber <= 3; orderNumber += 1) {
    await makeAndDeliverClassic(page, orderNumber)
    if (orderNumber < 3) {
      await page.waitForFunction(
        (count) => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === String(count),
        orderNumber,
        { timeout: 12_000 },
      )
    }
  }

  await page.locator('[data-ui-screen="summary"]').waitFor({ timeout: 20_000 })
  await waitForImages(page)
  await page.waitForTimeout(350)
  results.summaryReachedByThreeRealOrders = true
  results.allImagesDecoded = await page.evaluate(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0))
  results.icons = await page.locator('[data-upgrade-card-icon]').evaluateAll((icons) => icons.map((icon) => {
    const style = getComputedStyle(icon)
    const wrapper = icon.closest('.upgrade-shop__icon')
    const wrapperStyle = wrapper ? getComputedStyle(wrapper) : null
    const box = icon.getBoundingClientRect()
    return {
      kind: icon.getAttribute('data-upgrade-card-icon'),
      tagName: icon.tagName.toLowerCase(),
      viewBox: icon.getAttribute('viewBox'),
      strokeWidth: style.strokeWidth,
      strokeColor: style.stroke,
      lineCap: style.strokeLinecap,
      lineJoin: style.strokeLinejoin,
      filter: style.filter,
      width: Math.round(box.width * 10) / 10,
      height: Math.round(box.height * 10) / 10,
      wrapperShadow: wrapperStyle?.boxShadow ?? '',
      wrapperBackground: wrapperStyle?.backgroundColor ?? '',
      rasterDescendants: icon.querySelectorAll('img, image').length,
    }
  }))

  const [fundsBox, fireBox, signBox] = await Promise.all([
    page.locator('.summary-screen .upgrade-shop__funds').boundingBox(),
    page.getByRole('button', { name: '升级火力' }).boundingBox(),
    page.getByRole('button', { name: '升级招牌' }).boundingBox(),
  ])
  assert(fundsBox && fireBox && signBox, 'Summary upgrade card bounds are missing')
  results.layout = { funds: roundedBox(fundsBox), fire: roundedBox(fireBox), sign: roundedBox(signBox) }

  assert(results.icons.map(({ kind }) => kind).join(',') === 'funds,fire,sign', `Unexpected icon variants: ${JSON.stringify(results.icons)}`)
  assert(results.icons.every(({ tagName, viewBox, strokeWidth, lineCap, lineJoin, rasterDescendants }) => tagName === 'svg' && viewBox === '0 0 48 48' && strokeWidth === '2px' && lineCap === 'round' && lineJoin === 'round' && rasterDescendants === 0), `SVG family contract failed: ${JSON.stringify(results.icons)}`)
  assert(new Set(results.icons.map(({ strokeColor }) => strokeColor)).size === 1, `Outline colors differ: ${JSON.stringify(results.icons)}`)
  assert(new Set(results.icons.map(({ filter }) => filter)).size === 1, `Icon shadows differ: ${JSON.stringify(results.icons)}`)
  assert(Math.max(...results.icons.map(({ width }) => width)) - Math.min(...results.icons.map(({ width }) => width)) <= 1, `Icon widths differ: ${JSON.stringify(results.icons)}`)
  assert(Math.max(...results.icons.map(({ height }) => height)) - Math.min(...results.icons.map(({ height }) => height)) <= 1, `Icon heights differ: ${JSON.stringify(results.icons)}`)
  assert(within(fundsBox.x, 406.1) && within(fundsBox.y, 514.4) && within(fundsBox.width, 135.4) && within(fundsBox.height, 73.7), `Funds card moved: ${JSON.stringify(results.layout.funds)}`)
  assert(within(fireBox.x, 557.3) && within(fireBox.y, 488.4) && within(fireBox.width, 280.8) && within(fireBox.height, 124.7), `Fire card moved: ${JSON.stringify(results.layout.fire)}`)
  assert(within(signBox.x, 851) && within(signBox.y, 488.4) && within(signBox.width, 293.8) && within(signBox.height, 124.7), `Sign card moved: ${JSON.stringify(results.layout.sign)}`)
  assert(results.allImagesDecoded, 'One or more summary images did not decode')

  await page.screenshot({ path: screenshotPath, fullPage: false })
  results.comparison = await pixelDifference()
  assert(Object.values(results.comparison.changedPixelsByIconRegion).every((pixels) => pixels > 1_000), `Icon regions did not materially change from baseline: ${JSON.stringify(results.comparison)}`)
  assert(results.consoleErrors.length === 0, `Console errors: ${results.consoleErrors.join('\n')}`)
  assert(results.pageErrors.length === 0, `Page errors: ${results.pageErrors.join('\n')}`)

  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
  await context.close()
} finally {
  await browser.close()
  server.kill()
}
