import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4191
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'full-visual-consistency-v1')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const viewports = [
  { id: '1440x810', width: 1440, height: 810 },
  { id: '844x390', width: 844, height: 390 },
]
const states = [
  ['01-home', '首页'],
  ['02-select', '选关'],
  ['03-day-1-tutorial', 'Day 1 教程'],
  ['04-day-1-dual-griddle', 'Day 1 多顾客 / 双铁板'],
  ['05-summary', 'Day 1 结算'],
  ['06-summary-upgraded', '升级后的结算状态'],
  ['07-day-2', 'Day 2 游戏状态'],
  ['08-settings', '设置页'],
]

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
  const deadline = Date.now() + 60_000
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

async function startClassic(page, orderNumber, preferredSlotId = null) {
  await page.waitForFunction(() => {
    const boundOrderIds = new Set(
      [...document.querySelectorAll('[data-slot-id][data-order-id]')].map((slot) => slot.dataset.orderId),
    )
    return [...document.querySelectorAll('[data-customer-bubble-for][data-order-id]')]
      .some((bubble) => !boundOrderIds.has(bubble.dataset.orderId))
  }, null, { timeout: 25_000 })

  const emptySlot = preferredSlotId
    ? page.locator(`[data-slot-id="${preferredSlotId}"].phase-empty`)
    : page.locator('[data-slot-id].phase-empty').first()
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

async function diagnostics(page) {
  return page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight }
    const visible = (node) => {
      const style = getComputedStyle(node)
      const box = node.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
        && box.width > 0 && box.height > 0
    }
    const rect = (node) => {
      const box = node.getBoundingClientRect()
      return Object.fromEntries(['x', 'y', 'width', 'height', 'right', 'bottom']
        .map((key) => [key, Math.round(box[key] * 10) / 10]))
    }
    const critical = [...document.querySelectorAll('button, input, [role="progressbar"], [data-dynamic-mask], [data-screen-art], .rotate-device')]
      .filter(visible)
    const clipped = critical.map((node) => ({
      tag: node.tagName.toLowerCase(),
      className: typeof node.className === 'string' ? node.className : '',
      label: node.getAttribute('aria-label') ?? node.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '',
      box: rect(node),
    })).filter(({ box }) => box.x < -1 || box.y < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1)
    const images = [...document.images].filter(visible).map((image) => ({
      className: image.className,
      src: image.currentSrc.split('/').pop(),
      alt: image.alt,
      decoded: image.complete && image.naturalWidth > 0,
      box: rect(image),
    }))
    const svgIcons = [...document.querySelectorAll('svg')].filter(visible).map((icon) => ({
      className: icon.getAttribute('class') ?? '',
      dataIcon: icon.getAttribute('data-game-icon') ?? icon.getAttribute('data-upgrade-card-icon') ?? '',
      viewBox: icon.getAttribute('viewBox'),
      box: rect(icon),
    }))
    const symbolicGlyphs = [...new Set((document.body.innerText.match(/[★☆✓✕×？⚙🔒🔊🔇☰]/gu) ?? []))]
    const buttons = [...document.querySelectorAll('button')].filter(visible).map((button) => {
      const style = getComputedStyle(button)
      return {
        label: button.getAttribute('aria-label') ?? button.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '',
        disabled: button.disabled,
        pressed: button.getAttribute('aria-pressed'),
        background: style.backgroundImage === 'none' ? style.backgroundColor : style.backgroundImage,
        color: style.color,
        border: style.border,
        opacity: style.opacity,
        cursor: style.cursor,
        box: rect(button),
      }
    })
    return {
      viewport,
      screen: document.querySelector('[data-ui-screen]')?.getAttribute('data-ui-screen') ?? '',
      bodyOverflow: {
        horizontal: document.documentElement.scrollWidth > innerWidth + 1,
        vertical: document.documentElement.scrollHeight > innerHeight + 1,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      clipped,
      images,
      svgIcons,
      symbolicGlyphs,
      buttons,
      text: document.body.innerText.replace(/\s+/g, ' ').trim(),
    }
  })
}

async function capture(page, viewportId, stateId, stateName, results) {
  await waitForImages(page)
  await page.waitForTimeout(220)
  const filename = `${stateId}-${viewportId}.png`
  const record = await diagnostics(page)
  record.filename = filename
  record.state = stateName
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false })
  results.screenshots.push(record)
}

async function interactionStateCheck(page) {
  const target = page.locator('button:not(:disabled):visible').first()
  const getState = () => target.evaluate((button) => {
    const style = getComputedStyle(button)
    const box = button.getBoundingClientRect()
    return {
      transform: style.transform,
      filter: style.filter,
      background: style.backgroundImage === 'none' ? style.backgroundColor : style.backgroundImage,
      color: style.color,
      opacity: style.opacity,
      width: Math.round(box.width * 10) / 10,
      height: Math.round(box.height * 10) / 10,
    }
  })
  const base = await getState()
  await target.hover()
  const hover = await getState()
  const box = await target.boundingBox()
  assert(box, 'Interaction-state target has no bounds')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const active = await getState()
  await page.mouse.move(1, 1)
  await page.mouse.up()
  return { label: await target.getAttribute('aria-label'), base, hover, active }
}

function attachErrors(page, results, viewportId) {
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push({ viewport: viewportId, message: message.text() })
  })
  page.on('pageerror', (error) => results.pageErrors.push({ viewport: viewportId, message: error.message }))
}

async function runFlow(browser, viewport, results) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  attachErrors(page, results, viewport.id)
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
    localStorage.removeItem('night-market-audio-settings-v1')
  })

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="home"]').waitFor({ timeout: 120_000 })
  await capture(page, viewport.id, ...states[0], results)
  results.interactionStates[viewport.id] = { home: await interactionStateCheck(page) }

  await page.getByRole('button', { name: '查看关卡与成就' }).click()
  await page.locator('[data-ui-screen="select"]').waitFor()
  await capture(page, viewport.id, ...states[1], results)
  results.interactionStates[viewport.id].selectDisabled = await page.locator('.day-card:disabled').first().evaluate((button) => {
    const style = getComputedStyle(button)
    return { opacity: style.opacity, filter: style.filter, cursor: style.cursor, color: style.color }
  })
  await page.getByRole('button', { name: '返回主菜单' }).click()

  await page.getByRole('button', { name: '开始游戏' }).click()
  await page.locator('[data-ui-screen="playing"][data-day="1"]').waitFor({ timeout: 120_000 })
  await page.locator('[data-tutorial-step="noodle"]').waitFor({ timeout: 20_000 })
  await capture(page, viewport.id, ...states[2], results)

  await makeAndDeliverClassic(page, 1)
  await page.waitForFunction(() => document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') === '1', null, { timeout: 12_000 })
  const leftSlot = await startClassic(page, 2, 'left')
  const rightSlot = await startClassic(page, 3, 'right')
  await capture(page, viewport.id, ...states[3], results)
  await finishAndDeliverClassic(page, 2, leftSlot)
  await finishAndDeliverClassic(page, 3, rightSlot)

  await page.locator('[data-ui-screen="summary"]').waitFor({ timeout: 20_000 })
  await capture(page, viewport.id, ...states[4], results)
  await page.getByRole('button', { name: '升级火力' }).click()
  await capture(page, viewport.id, ...states[5], results)
  const upgradedButton = page.getByRole('button', { name: '升级火力' })
  results.interactionStates[viewport.id].summaryDisabled = await upgradedButton.evaluate((button) => {
    const style = getComputedStyle(button)
    return { disabled: button.disabled, opacity: style.opacity, filter: style.filter, cursor: style.cursor, color: style.color }
  })

  await page.getByRole('button', { name: '进入下一天：饭量挑战' }).click()
  await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor({ timeout: 20_000 })
  await page.locator('[data-customer-bubble-for]').first().waitFor({ timeout: 20_000 })
  await capture(page, viewport.id, ...states[6], results)

  const returnHome = page.getByRole('button', { name: '返回主页' })
  await returnHome.click()
  const abandonDialog = page.getByRole('dialog', { name: '放弃本次营业确认' })
  try {
    await abandonDialog.waitFor({ timeout: 3_000 })
  } catch {
    await returnHome.evaluate((button) => button.click())
    await abandonDialog.waitFor({ timeout: 10_000 })
  }
  await page.getByRole('button', { name: '放弃本次营业' }).click()
  await page.locator('[data-ui-screen="select"]').waitFor()
  await page.getByRole('button', { name: '返回主菜单' }).click()
  await page.getByRole('button', { name: '打开设置' }).click()
  await page.locator('[data-ui-screen="settings"]').waitFor()
  await capture(page, viewport.id, ...states[7], results)
  results.interactionStates[viewport.id].settings = await interactionStateCheck(page)

  await context.close()
}

async function captureRotatePrompt(browser, results) {
  const viewport = { id: '390x844', width: 390, height: 844 }
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  attachErrors(page, results, viewport.id)
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-guided-tutorial-v2')
  })
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByRole('button', { name: '开始游戏' }).click()
  await page.locator('.rotate-device').waitFor({ timeout: 20_000 })
  await capture(page, viewport.id, '09-rotate-prompt', '手机竖屏横屏提示', results)
  await context.close()
}

async function makeContactSheet(viewport) {
  const width = viewport.width
  const height = viewport.height
  const columns = 2
  const cellWidth = Math.round(width / 2)
  const cellHeight = Math.round(height / 2)
  const rows = Math.ceil(states.length / columns)
  const canvas = sharp({
    create: { width: cellWidth * columns, height: cellHeight * rows, channels: 3, background: '#171012' },
  })
  const composite = await Promise.all(states.map(async ([stateId], index) => ({
    input: await sharp(path.join(outputDir, `${stateId}-${viewport.id}.png`))
      .resize(cellWidth, cellHeight, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer(),
    left: index % columns * cellWidth,
    top: Math.floor(index / columns) * cellHeight,
  })))
  await canvas.composite(composite).png().toFile(path.join(outputDir, `contact-sheet-${viewport.id}.png`))
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const results = {
  capturedAt: new Date().toISOString(),
  browser: { name: 'Microsoft Edge', version: browser.version() },
  baseUrl,
  screenshots: [],
  interactionStates: {},
  consoleErrors: [],
  pageErrors: [],
}

try {
  for (const viewport of viewports) await runFlow(browser, viewport, results)
  await captureRotatePrompt(browser, results)
  for (const viewport of viewports) await makeContactSheet(viewport)

  const expectedNames = viewports.flatMap((viewport) => states.map(([stateId]) => `${stateId}-${viewport.id}.png`))
    .concat('09-rotate-prompt-390x844.png')
  assert(results.screenshots.length === expectedNames.length, `Expected ${expectedNames.length} screenshots, got ${results.screenshots.length}`)
  assert(expectedNames.every((name) => results.screenshots.some(({ filename }) => filename === name)), 'Screenshot manifest is incomplete')
  assert(results.screenshots.every(({ images }) => images.every(({ decoded }) => decoded)), 'One or more visible images failed to decode')
  assert(results.consoleErrors.length === 0, `Console errors: ${JSON.stringify(results.consoleErrors)}`)
  assert(results.pageErrors.length === 0, `Page errors: ${JSON.stringify(results.pageErrors)}`)

  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify({
    screenshots: results.screenshots.map(({ filename, state, clipped, bodyOverflow, symbolicGlyphs }) => ({ filename, state, clipped: clipped.length, bodyOverflow, symbolicGlyphs })),
    interactionStates: results.interactionStates,
    consoleErrors: results.consoleErrors,
    pageErrors: results.pageErrors,
  }, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
