import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright'

const outputDir = path.resolve(process.env.TRAY_QA_OUTPUT || 'docs/qa/screenshots/ingredient-tray')
const viewports = process.env.TRAY_QA_QUICK ? [[1440, 810]] : [[640, 360], [836, 470], [844, 390], [1440, 810]]
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const url = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'poki', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore', windowsHide: true })
const results = { build: 'poki-production', locale: 'en', sdk: 'Poki SDK mocked at network boundary', captures: [], errors: [] }
let browser
try {
  await mkdir(outputDir, { recursive: true })
  for (let i = 0; i < 200; i++) {
    try { if ((await fetch(url)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true })
  const captures = [1, 6].flatMap(day => viewports.map(([width, height]) => ({ day, width, height, dpr: 1 })))
  captures.push({ day: 6, width: 1440, height: 810, dpr: 3 }, { day: 1, width: 1440, height: 810, dpr: 3 })
  for (const { day, width, height, dpr } of captures) {
    console.log(`Tray QA: day ${day}, ${width}x${height}, DPR ${dpr}`)
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: width < 1000, hasTouch: width < 1000 })
    const page = await context.newPage()
    page.on('pageerror', error => results.errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') results.errors.push(message.text()) })
    await page.route('https://game-cdn.poki.com/scripts/v2/poki-sdk.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.__pokiMockEvents=[]; window.PokiSDK={init:async()=>{},gameLoadingFinished:()=>window.__pokiMockEvents.push("loaded"),gameplayStart:()=>{},gameplayStop:()=>{},commercialBreak:async()=>{}};' }))
    await page.addInitScript(({ day }) => {
      localStorage.clear(); sessionStorage.clear()
      localStorage.setItem('night-market-locale-v1', 'zh-CN')
      localStorage.setItem('night-market-guided-tutorial-v2', 'true')
      localStorage.setItem('night-market-campaign-v1', JSON.stringify({ coins: 360, fireLevel: 0, signLevel: 0, bestStars: day === 6 ? { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 } : {}, maxUnlockedDay: day }))
    }, { day })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__pokiMockEvents?.includes('loaded'))
    await page.getByRole('button', { name: day === 6 ? 'Continue' : 'Start Game', exact: true }).click()
    await page.locator('[data-ui-screen="playing"]').waitFor()
    await page.waitForFunction(() => document.querySelectorAll('.kitchen-customer__actor.presence-active').length >= 1)
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))) })
    await page.mouse.move(width - 2, height - 2)
    const diagnostic = await page.evaluate(() => {
      const logical = document.querySelector('.game-screen__logical').getBoundingClientRect()
      const scale = logical.width / 1440
      const toLogical = node => {
        const r = node.getBoundingClientRect()
        return { left: (r.left - logical.left) / scale, top: (r.top - logical.top) / scale, width: r.width / scale, height: r.height / scale }
      }
      return {
        lang: document.documentElement.lang,
        day: Number(document.querySelector('[data-day]').dataset.day),
        layout: document.querySelector('[data-rack-layout]').dataset.rackLayout,
        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
        rackPlate: { loaded: document.querySelector('.kitchen-scene__ingredient-rack-plate').naturalWidth > 0, zIndex: getComputedStyle(document.querySelector('.kitchen-scene__ingredient-rack-plate')).zIndex },
        ingredients: [...document.querySelectorAll('[data-ingredient-id]')].map(control => {
          const label = control.querySelector('.table-ingredient__label')
          const labelRect = label.getBoundingClientRect()
          const labelHit = document.elementFromPoint(labelRect.left + labelRect.width / 2, labelRect.top + labelRect.height / 2)?.closest('[data-ingredient-id]')?.getAttribute('data-ingredient-id')
          return { id: control.dataset.ingredientId, image: toLogical(control.querySelector('.table-ingredient__food-art')), label: toLogical(label), labelClipped: label.scrollWidth > label.clientWidth + 1, labelHit, text: label.textContent, control: toLogical(control) }
        }),
      }
    })
    assert(diagnostic.lang === 'en', 'Not English production')
    assert(diagnostic.day === day, 'Wrong day')
    assert(!diagnostic.overflow, 'Viewport overflow')
    assert(diagnostic.rackPlate.loaded && Number(diagnostic.rackPlate.zIndex) > 4, 'Rack plate hidden beneath counter foreground')
    assert(diagnostic.ingredients.length === (day === 6 ? 15 : 5), 'Ingredient count changed')
    assert(diagnostic.ingredients.every(i => !i.labelClipped), `Clipped label: ${diagnostic.ingredients.filter(i => i.labelClipped).map(i => i.id)}`)
    assert(diagnostic.ingredients.every(i => i.labelHit === i.id), `Label targets wrong ingredient: ${JSON.stringify(diagnostic.ingredients.filter(i => i.labelHit !== i.id))}`)
    const name = dpr === 3 ? (day === 6 ? 'ingredient-tray-closeup.png' : 'ingredient-tray-day1-closeup.png') : `ingredient-tray-${day === 1 ? 'day1-' : ''}${width}x${height}.png`
    await page.screenshot({ path: path.join(outputDir, name), ...(dpr === 3 ? { clip: { x: 0, y: 460, width: 420, height: 305 } } : {}) })
    // Hover must never lift or enlarge an ingredient away from its floor.
    const art = page.locator('[data-ingredient-id="noodle"] .table-ingredient__food-art')
    const before = await art.boundingBox()
    await page.locator('[data-ingredient-id="noodle"]').hover()
    await page.waitForTimeout(150)
    const after = await art.boundingBox()
    assert(['x', 'y', 'width', 'height'].every(k => Math.abs(before[k] - after[k]) < .1), 'Hover moved the food')
    results.captures.push({ day, width, height, dpr, screenshot: name, ...diagnostic })
    await context.close()
  }
  for (const day of [1, 6]) {
    const captures = results.captures.filter(c => c.day === day && c.dpr === 1)
    const reference = captures.find(c => c.width === 1440)
    for (const capture of captures) for (const ingredient of capture.ingredients) {
      const expected = reference.ingredients.find(i => i.id === ingredient.id)
      for (const layer of ['image', 'label']) for (const key of ['left', 'top', 'width', 'height']) {
        assert(Math.abs(ingredient[layer][key] - expected[layer][key]) < .12, `Logical-coordinate drift: Day ${day} ${ingredient.id} ${capture.width} ${layer}.${key}`)
      }
    }
  }
  assert(results.errors.length === 0, results.errors.join('\n'))
  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
  console.log(`Saved ${results.captures.length} screenshots to ${outputDir}`)
} finally {
  await browser?.close()
  server.kill()
}
