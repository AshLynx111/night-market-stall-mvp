import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4181
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'gameplay-ui-polish-v3')
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
const results = { capturedAt: new Date().toISOString(), baseUrl, screenshots: [], keyboardChecks: {}, consoleErrors: [] }

async function openGame(viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
  page.on('console', (message) => { if (message.type() === 'error') results.consoleErrors.push(message.text()) })
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  })
  await page.goto(`${baseUrl}/?playDay=2`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator('[data-ui-screen="playing"]').waitFor({ timeout: 60_000 })
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 60_000 })
  return page
}

async function capture(page, filename, state, visibleDialog = null) {
  await page.waitForTimeout(420)
  if (visibleDialog) await page.getByRole('dialog', { name: visibleDialog }).waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(outputDir, filename) })
  results.screenshots.push({ filename, viewport: page.viewportSize(), state })
}

async function verifyKeyboardFlow(page, prefix) {
  const pause = page.getByRole('button', { name: '暂停并打开菜单' })
  await pause.focus()

  await page.keyboard.press('h')
  const help = page.getByRole('dialog', { name: '玩法说明' })
  await help.waitFor()
  const firstHelpFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  await page.keyboard.press('Shift+Tab')
  const reverseWrappedTo = await page.evaluate(() => document.activeElement?.textContent?.trim())
  await capture(page, `${prefix}-help.png`, 'help opened with H and keyboard focus trapped', '玩法说明')
  await page.keyboard.press('Escape')
  await help.waitFor({ state: 'detached' })

  await pause.focus()
  await page.keyboard.press('Escape')
  const menu = page.getByRole('dialog', { name: '完整菜单' })
  await menu.waitFor()
  const menuFocus = await page.evaluate(() => document.activeElement?.className)
  await capture(page, `${prefix}-pause-menu.png`, 'pause menu opened with Escape', '完整菜单')
  await page.keyboard.press('Escape')
  await menu.waitFor({ state: 'detached' })
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '暂停并打开菜单')
  const restoredLabel = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))

  const soundBefore = await page.getByRole('button', { name: '关闭音乐' }).getAttribute('aria-label')
  await page.keyboard.press('m')
  const soundAfter = await page.getByRole('button', { name: '开启音乐' }).getAttribute('aria-label')

  return { firstHelpFocus, reverseWrappedTo, menuFocus, restoredLabel, soundBefore, soundAfter }
}

try {
  let page = await openGame({ width: 1440, height: 810 })
  results.keyboardChecks.desktop = await verifyKeyboardFlow(page, 'desktop-1440x810')
  const progress = page.getByRole('progressbar', { name: /已完成订单/ })
  results.keyboardChecks.progressbar = {
    min: await progress.getAttribute('aria-valuemin'),
    max: await progress.getAttribute('aria-valuemax'),
    now: await progress.getAttribute('aria-valuenow'),
  }
  await page.close()

  page = await openGame({ width: 844, height: 390 })
  results.keyboardChecks.mobile = await verifyKeyboardFlow(page, 'mobile-844x390')
  await page.close()

  if (results.consoleErrors.length) throw new Error(`Console errors: ${results.consoleErrors.join('\n')}`)
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
