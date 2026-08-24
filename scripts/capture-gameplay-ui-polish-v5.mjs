import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4183
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v5')
await mkdir(outputDir, { recursive: true })

const viteEntry = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
const server = spawn(process.execPath, [viteEntry, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`Vite did not start:\n${serverLog}`)
}

await waitForServer()
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})
const results = {
  capturedAt: new Date().toISOString(),
  baseUrl,
  viewport: { width: 667, height: 375 },
  syntheticSafeInsets: { top: 8, right: 44, bottom: 21, left: 44 },
  screenshots: [],
  bounds: {},
  flowChecks: {},
  consoleErrors: [],
}

async function capture(page, filename, state) {
  await page.waitForTimeout(180)
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, state })
}

try {
  const page = await browser.newPage({
    viewport: results.viewport,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  })
  page.on('console', (message) => {
    if (message.type() === 'error') results.consoleErrors.push(message.text())
  })
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  })
  await page.goto(`${baseUrl}/?playDay=2`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen="playing"]').waitFor({ timeout: 120_000 })
  await page.addStyleTag({ content: `
    .game-screen {
      --game-safe-top: 8px !important;
      --game-safe-right: 44px !important;
      --game-safe-bottom: 21px !important;
      --game-safe-left: 44px !important;
    }
    .game-screen__safe-viewport { box-shadow: inset 0 0 0 2px rgba(255, 214, 107, .8); }
    .modal-backdrop { padding: 18px 44px 21px !important; }
  ` })
  await page.waitForFunction(() => {
    const safe = document.querySelector('.game-screen__safe-viewport')?.getBoundingClientRect()
    const logical = document.querySelector('.game-screen__logical')?.getBoundingClientRect()
    if (!safe || !logical) return false
    return logical.left >= safe.left - 1
      && logical.right <= safe.right + 1
      && logical.top >= safe.top - 1
      && logical.bottom <= safe.bottom + 1
  }, null, { timeout: 10_000 })
  await page.waitForFunction(() => document.querySelectorAll('[data-customer-id].presence-active').length >= 1, null, { timeout: 12_000 })

  results.bounds = await page.evaluate(() => {
    const main = document.querySelector('.game-screen')
    const safe = document.querySelector('.game-screen__safe-viewport')?.getBoundingClientRect()
    const logical = document.querySelector('.game-screen__logical')?.getBoundingClientRect()
    const pause = document.querySelector('[aria-label="暂停并打开菜单"]')?.getBoundingClientRect()
    const style = main ? getComputedStyle(main) : null
    const serialize = (value) => value ? {
      left: value.left, top: value.top, right: value.right, bottom: value.bottom,
      width: value.width, height: value.height,
    } : null
    return {
      safe: serialize(safe),
      logical: serialize(logical),
      pause: serialize(pause),
      scale: Number.parseFloat(document.querySelector('.game-screen__logical')?.style.getPropertyValue('--scene-scale') ?? '0'),
      computedInsets: style ? {
        top: style.getPropertyValue('--game-safe-top').trim(),
        right: style.getPropertyValue('--game-safe-right').trim(),
        bottom: style.getPropertyValue('--game-safe-bottom').trim(),
        left: style.getPropertyValue('--game-safe-left').trim(),
      } : null,
    }
  })

  await page.locator('[data-ingredient-id="noodle"]').tap()
  await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').waitFor()
  await capture(page, 'notched-gameplay-667x375.png', 'tap placement inside synthetic landscape safe area')

  const pauseButton = page.getByRole('button', { name: '暂停并打开菜单' })
  await pauseButton.tap()
  const pauseDialog = page.getByRole('dialog', { name: '完整菜单' })
  await pauseDialog.waitFor()
  const modalBounds = await pauseDialog.evaluate((dialog) => {
    const panel = dialog.getBoundingClientRect()
    const close = dialog.querySelector('.modal-close')?.getBoundingClientRect()
    const serialize = (value) => value ? {
      left: value.left, top: value.top, right: value.right, bottom: value.bottom,
      width: value.width, height: value.height,
    } : null
    return { panel: serialize(panel), close: serialize(close) }
  })
  results.bounds.modal = modalBounds.panel
  results.bounds.modalClose = modalBounds.close
  await capture(page, 'notched-pause-667x375.png', 'pause dialog inside synthetic landscape safe area')

  const { safe, logical, pause } = results.bounds
  const inside = (inner, outer) => inner && outer
    && inner.left >= outer.left - 1 && inner.right <= outer.right + 1
    && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1
  results.flowChecks = {
    logicalInsideSafeViewport: inside(logical, safe),
    pauseControlInsideSafeViewport: inside(pause, safe),
    pauseDialogInsideSafeViewport: inside(results.bounds.modal, safe),
    closeControlInsideSafeViewport: inside(results.bounds.modalClose, safe),
    touchPlacementCompleted: await page.locator('[data-slot-id="left"][data-stage-step="noodle"]').count() === 1,
    pauseDialogOpened: await page.getByRole('dialog', { name: '完整菜单' }).count() === 1,
  }

  if (!Object.values(results.flowChecks).every(Boolean)) throw new Error(`Safe viewport checks failed: ${JSON.stringify(results.flowChecks)}`)
  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
  await page.close()
} finally {
  await browser.close()
  server.kill()
}
