import { spawn } from 'node:child_process'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const root = process.cwd()
const url = 'http://127.0.0.1:53787/'
const preview = spawn(process.execPath, [
  `${root}/node_modules/vite/bin/vite.js`, '--host', '127.0.0.1', '--port', '53787', '--strictPort',
], { cwd: root, stdio: 'ignore', windowsHide: true })
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
for (let attempt = 0; attempt < 100; attempt += 1) {
  try { if ((await fetch(url)).ok) break } catch { /* retry */ }
  await delay(100)
}

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } })
const consoleErrors = []
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
await page.goto(url)
if (await page.locator('audio[data-game-bgm]').count() !== 0) throw new Error('BGM autoplayed before user gesture')
await page.getByRole('button', { name: '打开设置' }).click()
await page.waitForFunction(() => document.querySelector('audio[data-game-bgm]')?.paused === false)
const before = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ loop: audio.loop, volume: audio.volume, currentTime: audio.currentTime, paused: audio.paused }))
await page.locator('audio[data-game-bgm]').evaluate((audio) => { audio.currentTime = 12.5 })
await delay(700)
await page.getByRole('button', { name: '返回主菜单' }).click()
await page.getByRole('button', { name: '查看关卡与成就' }).click()
const afterNavigation = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ count: document.querySelectorAll('audio[data-game-bgm]').length, currentTime: audio.currentTime, paused: audio.paused }))
await page.getByRole('button', { name: '返回主菜单' }).click()
await page.getByRole('button', { name: '打开设置' }).click()
await page.getByRole('slider', { name: '总音量' }).fill('0.5')
await page.getByRole('slider', { name: '背景音乐音量' }).fill('0.4')
const sliderVolume = await page.locator('audio[data-game-bgm]').evaluate((audio) => audio.volume)
await page.getByRole('button', { name: '背景音乐' }).click()
const muted = await page.locator('audio[data-game-bgm]').evaluate((audio) => ({ muted: audio.muted, volume: audio.volume }))
const result = { before, afterNavigation, sliderVolume, muted, consoleErrors }
if (!before.loop || before.paused) throw new Error(`Invalid startup ${JSON.stringify(result)}`)
if (afterNavigation.count !== 1 || afterNavigation.paused || afterNavigation.currentTime < 12.4) throw new Error(`Navigation reset audio ${JSON.stringify(result)}`)
if (Math.abs(sliderVolume - 0.2) > 0.001) throw new Error(`Slider mix incorrect ${JSON.stringify(result)}`)
if (!muted.muted || muted.volume !== 0) throw new Error(`Mute incorrect ${JSON.stringify(result)}`)
if (consoleErrors.length) throw new Error(`Console errors ${JSON.stringify(result)}`)
console.log(JSON.stringify(result, null, 2))
await browser.close()
preview.kill()
