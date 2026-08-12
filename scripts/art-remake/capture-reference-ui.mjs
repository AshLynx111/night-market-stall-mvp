import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const output = path.resolve(process.env.CAPTURE_OUTPUT ?? 'artifacts/reference-remake/review/current-gameplay.png')
await fs.mkdir(path.dirname(output), { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
  if (process.env.TUTORIAL_DONE === '1') {
    await page.addInitScript(() => localStorage.setItem('night-market-guided-tutorial-v2', 'true'))
  }
  const errors = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(process.env.CAPTURE_URL ?? 'http://127.0.0.1:60876/?playDay=1', { waitUntil: 'networkidle' })
  await page.waitForTimeout(Number(process.env.CAPTURE_DELAY_MS ?? 3200))
  await page.screenshot({ path: output })
  process.stdout.write(`${output}\n`)
  if (errors.length) process.stdout.write(`console-errors=${JSON.stringify(errors)}\n`)
} finally {
  await browser.close()
}
