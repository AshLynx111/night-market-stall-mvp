import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const root = process.cwd()
const port = 4192
const baseUrl = `http://127.0.0.1:${port}`
const outputDir = path.join(root, 'docs', 'qa', 'screenshots', 'i18n-and-text-panel-prep-v1')
const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const locales = ['zh-CN', 'en']
const viewports = [
  { id: '1440x810', width: 1440, height: 810 },
  { id: '844x390', width: 844, height: 390 },
]
const states = [
  { id: '01-home', name: 'Home', query: '' },
  { id: '02-select', name: 'Day select', query: 'qaScreen=select' },
  { id: '03-day1-initial', name: 'Day 1 initial tutorial', query: 'playDay=1' },
  { id: '04-multi-customer', name: 'Multiple customers / dual griddle', query: 'playDay=2', tutorialComplete: true },
  { id: '05-summary', name: 'Day 1 summary', query: 'playDay=1&qaScreen=summary' },
  { id: '06-settings', name: 'Settings', query: '', action: 'settings' },
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
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
    null,
    { timeout: 120_000 },
  )
}

async function inspect(page, locale) {
  return page.evaluate((expectedLocale) => {
    const visible = (node) => {
      const style = getComputedStyle(node)
      const box = node.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0
    }
    const candidates = [...document.querySelectorAll('button, input, [role], [data-locale-art-text], [data-dynamic-mask]')].filter(visible)
    const clipped = candidates.map((node) => {
      const box = node.getBoundingClientRect()
      return {
        label: node.getAttribute('aria-label') ?? node.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '',
        x: Math.round(box.x), y: Math.round(box.y), right: Math.round(box.right), bottom: Math.round(box.bottom),
      }
    }).filter((box) => box.x < -1 || box.y < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1)
    const cjkAttributes = expectedLocale === 'en'
      ? [...document.querySelectorAll('[aria-label], [title], img[alt]')].flatMap((node) => ['aria-label', 'title', 'alt']
          .map((attribute) => ({ attribute, value: node.getAttribute(attribute) ?? '' }))
          .filter(({ value }) => /[\u3400-\u9fff]/u.test(value)))
      : []
    const text = document.body.innerText.replace(/\s+/g, ' ').trim()
    return {
      htmlLang: document.documentElement.lang,
      dataLocale: document.documentElement.dataset.locale,
      screen: document.querySelector('[data-ui-screen]')?.getAttribute('data-ui-screen') ?? '',
      viewport: { width: innerWidth, height: innerHeight },
      overflow: {
        horizontal: document.documentElement.scrollWidth > innerWidth + 1,
        vertical: document.documentElement.scrollHeight > innerHeight + 1,
      },
      clipped,
      cjkText: expectedLocale === 'en' && /[\u3400-\u9fff]/u.test(text) ? text.match(/[\u3400-\u9fff]{1,24}/gu) : [],
      cjkAttributes,
      semanticPanels: {
        surfaces: document.querySelectorAll('.ui-text-surface').length,
        paper: document.querySelectorAll('.ui-text-surface--paper').length,
        wood: document.querySelectorAll('.ui-text-surface--wood').length,
        chips: document.querySelectorAll('.ui-text-chip').length,
      },
      text,
    }
  }, locale)
}

async function capture(browser, locale, viewport, state, results) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript(({ tutorialComplete }) => {
    localStorage.removeItem('night-market-campaign-v1')
    localStorage.removeItem('night-market-audio-settings-v1')
    localStorage.removeItem('night-market-locale-v1')
    if (tutorialComplete) localStorage.setItem('night-market-guided-tutorial-v2', 'true')
    else localStorage.removeItem('night-market-guided-tutorial-v2')
  }, { tutorialComplete: Boolean(state.tutorialComplete) })
  const params = new URLSearchParams(state.query)
  params.set('lang', locale)
  await page.goto(`${baseUrl}/?${params}`, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.locator('[data-ui-screen]').waitFor({ timeout: 120_000 })
  if (state.action === 'settings') {
    await page.getByRole('button', { name: locale === 'en' ? 'Open settings' : '打开设置' }).click()
    await page.locator('[data-ui-screen="settings"]').waitFor()
  }
  await waitForImages(page)
  if (state.id.includes('day1')) await page.locator('[data-tutorial-step]').waitFor({ timeout: 20_000 })
  if (state.id === '04-multi-customer') await page.locator('[data-customer-bubble-for]').first().waitFor({ timeout: 20_000 })
  await page.waitForTimeout(250)
  const filename = `${locale}-${state.id}-${viewport.id}.png`
  const diagnostic = await inspect(page, locale)
  await page.screenshot({ path: path.join(outputDir, filename), fullPage: false })
  results.push({ locale, viewport: viewport.id, state: state.name, filename, consoleErrors, pageErrors, ...diagnostic })
  await context.close()
}

async function makeContactSheet(locale, viewport) {
  const columns = 2
  const rows = Math.ceil(states.length / columns)
  const cellWidth = Math.round(viewport.width / 2)
  const cellHeight = Math.round(viewport.height / 2)
  const canvas = sharp({ create: {
    width: cellWidth * columns,
    height: cellHeight * rows,
    channels: 3,
    background: '#171012',
  } })
  const composite = await Promise.all(states.map(async (state, index) => ({
    input: await sharp(path.join(outputDir, `${locale}-${state.id}-${viewport.id}.png`))
      .resize(cellWidth, cellHeight, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer(),
    left: index % columns * cellWidth,
    top: Math.floor(index / columns) * cellHeight,
  })))
  await canvas.composite(composite).png().toFile(path.join(outputDir, `contact-sheet-${locale}-${viewport.id}.png`))
}

await waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: edgePath })
const results = []
try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      for (const state of states) await capture(browser, locale, viewport, state, results)
      await makeContactSheet(locale, viewport)
    }
  }
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  assert(results.length === locales.length * viewports.length * states.length, `Expected 24 screenshots, got ${results.length}`)
  assert(results.every(({ consoleErrors, pageErrors }) => consoleErrors.length === 0 && pageErrors.length === 0), 'Browser errors found')
  assert(results.filter(({ locale }) => locale === 'en').every(({ htmlLang, dataLocale }) => htmlLang === 'en' && dataLocale === 'en'), 'English locale marker missing')
  assert(results.filter(({ locale }) => locale === 'en').every(({ cjkText, cjkAttributes }) => cjkText.length === 0 && cjkAttributes.length === 0), 'English dynamic DOM still contains CJK')
  process.stdout.write(`${JSON.stringify(results.map(({ locale, viewport, state, filename, overflow, clipped, cjkText, cjkAttributes, semanticPanels }) => ({
    locale, viewport, state, filename, overflow, clipped: clipped.length, cjkText, cjkAttributes, semanticPanels,
  })), null, 2)}\n`)
} finally {
  await browser.close()
  server.kill()
}
