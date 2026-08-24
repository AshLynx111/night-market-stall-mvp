import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4188
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'day-retention-loop-v1')
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

async function capture(page, filename, state, results) {
  await waitForImages(page)
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false })
  results.screenshots.push({ filename, state })
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const results = {
  capturedAt: new Date().toISOString(),
  browser: { name: 'Microsoft Edge', version: browser.version() },
  baseUrl,
  screenshots: [],
  flowChecks: {},
  selectChecks: {},
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
  const nextCue = page.locator('[data-day-retention-cue="next"]')
  await nextCue.waitFor()
  const nextCueText = (await nextCue.innerText()).replace(/\s+/g, ' ').trim()
  const nextButton = page.getByRole('button', { name: '进入下一天：饭量挑战' })
  const nextButtonText = (await nextButton.innerText()).replace(/\s+/g, ' ').trim()

  results.flowChecks = {
    summaryReachedByThreeRealOrders: true,
    nextCueText,
    nextCueNamesTomorrow: nextCueText.includes('明日 · 饭量挑战'),
    nextCueNamesUnlock: nextCueText.includes('大胃王解锁'),
    nextButtonText,
    nextButtonIsSpecific: nextButtonText.includes('明天 · 饭量挑战'),
    tutorialCompleted: await page.evaluate(() => localStorage.getItem('night-market-guided-tutorial-v2') === 'true'),
    allImagesDecoded: await page.evaluate(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0)),
  }
  assert(Object.values(results.flowChecks).every(Boolean), `Day 1 retention flow failed: ${JSON.stringify(results.flowChecks)}`)

  await capture(page, 'summary-next-day-1440x810.png', 'real Day 1 completion with Day 2 retention cue', results)
  await page.setViewportSize({ width: 844, height: 390 })
  await capture(page, 'summary-next-day-844x390.png', 'compact landscape Day 1 completion cue', results)
  await page.setViewportSize({ width: 1440, height: 810 })
  await nextButton.click()
  await page.locator('[data-ui-screen="playing"][data-day="2"]').waitFor({ timeout: 20_000 })
  const persistedSave = await page.evaluate(() => JSON.parse(localStorage.getItem('night-market-campaign-v1') ?? 'null'))
  results.flowChecks.nextActionStartsDay2 = true
  results.flowChecks.day1Persisted = (persistedSave?.bestStars?.['1'] ?? 0) > 0 && persistedSave?.maxUnlockedDay >= 2
  assert(results.flowChecks.day1Persisted, `Day 1 completion did not persist: ${JSON.stringify(persistedSave)}`)
  await context.close()

  const selectContext = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  const selectPage = await selectContext.newPage()
  selectPage.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  selectPage.on('pageerror', (error) => results.pageErrors.push(error.message))
  await selectPage.addInitScript(() => {
    localStorage.setItem('night-market-campaign-v1', JSON.stringify({
      coins: 84,
      fireLevel: 0,
      signLevel: 0,
      bestStars: { 1: 3, 2: 2 },
      maxUnlockedDay: 3,
    }))
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  })
  await selectPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await selectPage.locator('[data-ui-screen="home"]').waitFor({ timeout: 120_000 })
  await selectPage.getByRole('button', { name: '查看关卡与成就' }).click()
  await selectPage.locator('[data-ui-screen="select"]').waitFor()
  await waitForImages(selectPage)

  const hooks = selectPage.locator('[data-current-day-hook]')
  const hookCount = await hooks.count()
  const hookText = hookCount === 1 ? (await hooks.first().innerText()).replace(/\s+/g, ' ').trim() : ''
  const hookOnDay3 = hookCount === 1 && await hooks.first().evaluate((node) => Boolean(node.closest('.day-card--3')))
  const lockedStates = await selectPage.locator('.day-card').evaluateAll((cards) => cards.map((card) => ({
    day: Number([...card.classList].find((name) => name.startsWith('day-card--'))?.replace('day-card--', '')),
    disabled: card.disabled,
  })))
  results.selectChecks = {
    exactlyOneCurrentHook: hookCount === 1,
    hookText,
    hookOnDay3,
    hookNamesUnlock: hookText.includes('招牌芝士火鸡解锁'),
    settledDaysHaveNoHook: await selectPage.locator('.day-card--1 [data-current-day-hook], .day-card--2 [data-current-day-hook]').count() === 0,
    futureDaysLocked: lockedStates.filter(({ day }) => day >= 4).every(({ disabled }) => disabled),
    playableDaysUnlocked: lockedStates.filter(({ day }) => day <= 3).every(({ disabled }) => !disabled),
  }
  assert(Object.values(results.selectChecks).every(Boolean), `Current target selection failed: ${JSON.stringify(results.selectChecks)}`)
  await capture(selectPage, 'current-day-select-1440x810.png', 'Day 3 is the single current retention target', results)
  await selectContext.close()

  assert(results.consoleErrors.length === 0, `Console errors: ${results.consoleErrors.join('\n')}`)
  assert(results.pageErrors.length === 0, `Page errors: ${results.pageErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
