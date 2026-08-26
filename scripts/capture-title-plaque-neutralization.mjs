import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4194
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'title-plaque-neutralization')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const viewport = { width: 1440, height: 810 }
const states = [
  { id: 'home', name: 'Home', query: '', selector: '.home-screen__locale-title' },
  { id: 'settings', name: 'Settings', query: '', action: 'settings', selector: '.settings-screen__game-title' },
  { id: 'day-select', name: 'Day Select', query: 'qaScreen=select', selector: '.select-screen__locale-title' },
  { id: 'summary', name: 'Summary', query: 'playDay=1&qaScreen=summary', selector: '.summary-screen__locale-heading' },
]

await mkdir(outputDir, { recursive: true })

const server = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1', '--port', String(port), '--strictPort',
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
  throw new Error(`Vite did not start:\n${serverLog}`)
}

async function waitForImages(page) {
  await page.waitForFunction(
    () => [...document.images].every((item) => item.complete && item.naturalWidth > 0),
    null,
    { timeout: 120_000 },
  )
}

async function capture(browser, state) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(() => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-audio-settings-v1')
    localStorage.removeItem('night-market-locale-v1')
    localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  })
  const params = new URLSearchParams(state.query)
  params.set('lang', 'en')
  await page.goto(`${baseUrl}/?${params}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen]').waitFor({ timeout: 120_000 })
  if (state.action === 'settings') {
    await page.getByRole('button', { name: 'Open settings' }).click()
    await page.locator('[data-ui-screen="settings"]').waitFor()
  }
  await waitForImages(page)
  await page.waitForTimeout(300)
  const diagnostic = await page.locator(state.selector).evaluate((node) => {
    const style = getComputedStyle(node)
    const pseudo = getComputedStyle(node, '::before')
    const box = node.getBoundingClientRect()
    return {
      text: node.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      pseudoBackground: pseudo.backgroundImage,
      pseudoMask: pseudo.webkitMaskImage || pseudo.maskImage,
      overflow: {
        horizontal: document.documentElement.scrollWidth > innerWidth + 1,
        vertical: document.documentElement.scrollHeight > innerHeight + 1,
      },
      htmlLang: document.documentElement.lang,
      dataLocale: document.documentElement.dataset.locale,
    }
  })
  const filename = `after-${state.id}-1440x810.png`
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false })
  await context.close()
  return { state: state.name, filename, consoleErrors, pageErrors, ...diagnostic }
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
try {
  const results = []
  for (const state of states) results.push(await capture(browser, state))
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  assert(results.length === 4, `Expected four screenshots, got ${results.length}`)
  assert(results.every(({ consoleErrors, pageErrors }) => consoleErrors.length === 0 && pageErrors.length === 0), 'Browser errors found')
  assert(results.every(({ overflow }) => !overflow.horizontal && !overflow.vertical), 'Document overflow found')
  assert(results.every(({ htmlLang, dataLocale }) => htmlLang === 'en' && dataLocale === 'en'), 'English locale metadata missing')
  assert(results.every(({ backgroundColor, backgroundImage, borderWidth, boxShadow }) => (
    backgroundColor === 'rgba(0, 0, 0, 0)'
      && backgroundImage === 'none'
      && borderWidth === '0px'
      && boxShadow === 'none'
  )), 'A title container still renders an opaque panel')
  assert(results.every(({ pseudoBackground, pseudoMask }) => pseudoBackground !== 'none' && pseudoMask !== 'none'), 'A neutral texture mask is missing')
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
