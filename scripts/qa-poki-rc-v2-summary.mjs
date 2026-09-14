import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
process.env.POKI_RC_QA = '1'
process.env.POKI_QA_PORT = '4196'
const h = await import('./qa-poki-platform-build-v1.mjs')
const out = 'docs/qa/poki-rc-v2'
await mkdir(out, { recursive: true })
const result = { build: 'production Poki', sdk: 'SDK entry mock for deterministic game-origin isolation; no real downstream requests intercepted', screenshots: [], requests: [], initiators: [], errors: [] }
const check = (ok, message) => { if (!ok) throw new Error(message) }
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
result.productionIndexSha256 = hash(await readFile('dist-poki/index.html'))
async function stableScreenshot(page) {
  let previous = await page.screenshot({ animations: 'disabled' })
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.waitForTimeout(150)
    const current = await page.screenshot({ animations: 'disabled' })
    if (current.equals(previous)) return current
    previous = current
  }
  throw new Error('Summary screenshot did not settle')
}
await h.waitForServer()
const browser = await chromium.launch({ headless: true, executablePath: h.edgePath })
try {
  for (const locale of ['en', 'zh-CN']) {
    const { context, page } = await h.createPage(browser, { viewport: { width: 1440, height: 810 } })
    page.on('pageerror', e => result.errors.push(e.message))
    page.on('console', m => { if (m.type() === 'error') result.errors.push(m.text()) })
    page.on('response', r => { if (r.status() >= 400) result.errors.push(`${r.status()} ${r.url()}`) })
    page.on('request', request => {
      const url = request.url(), local = new URL(url).origin === h.baseUrl
      result.requests.push({ request: url, domain: new URL(url).hostname, origin: url === h.sdkUrl ? 'Poki SDK bootstrap (mocked)' : 'Game', reason: request.resourceType(), allowed: local || url === h.sdkUrl })
    })
    const cdp = await context.newCDPSession(page); await cdp.send('Network.enable')
    cdp.on('Network.requestWillBeSent', e => {
      if (e.request.url.startsWith('http')) result.initiators.push({ request: e.request.url, type: e.initiator.type, parserUrl: e.initiator.url, frames: e.initiator.stack?.callFrames?.slice(0, 3) })
    })
    await page.goto(h.baseUrl + (locale === 'en' ? '/' : '/?lang=zh-CN'), { waitUntil: 'networkidle' })
    await page.locator('.home-hotspot--start').click()
    for (let order = 0; order < 3; order++) await h.completeOrder(page, false)
    await page.locator('[data-ui-screen="summary"]').waitFor()
    await page.waitForTimeout(500)
    for (const [width, height] of [[640,360],[836,470],[844,390],[1440,810]]) {
      await page.setViewportSize({ width, height }); await page.mouse.move(0,0); await page.waitForTimeout(250)
      const measurements = await page.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
        const obstacles = [...document.querySelectorAll('.summary-stats,.summary-screen .upgrade-shop>button,.summary-actions button')].map(rect)
        return ['.summary-message','.summary-retention'].map(selector => {
          const el = document.querySelector(selector), range = document.createRange(); range.selectNodeContents(el)
          const container = rect(el), text = rect({ getBoundingClientRect: () => range.getBoundingClientRect() }), style = getComputedStyle(el)
          return { selector, copy: el.textContent, container, text, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, fontSize: style.fontSize, overflow: style.overflow, overlap: obstacles.some(o => Math.min(text.right,o.right)>Math.max(text.left,o.left)+1 && Math.min(text.bottom,o.bottom)>Math.max(text.top,o.top)+1) }
        })
      })
      result.lastMeasurement = { locale, width, height, measurements }
      if (locale === 'en') for (const m of measurements) {
        check(m.scrollWidth <= m.clientWidth, `${width} ${m.selector} horizontal overflow`)
        check(m.scrollHeight <= m.clientHeight, `${width} ${m.selector} vertical overflow`)
        check(m.text.left >= m.container.left-1 && m.text.right <= m.container.right+1 && m.text.top >= m.container.top-1 && m.text.bottom <= m.container.bottom+1, `${width} ${m.selector} text outside region`)
        check(!m.overlap && m.overflow !== 'hidden', `${width} ${m.selector} overlaps controls or clips text`)
      }
      const filename = `summary-${width}x${height}-${locale === 'en' ? 'en' : 'zh'}.png`
      const current = await stableScreenshot(page)
      await writeFile(`${out}/${filename}`, current)
      const record = { locale, width, height, filename, measurements }
      // Revert only the new media rule in CSSOM to compare against the frozen CSS baseline.
      if (locale === 'zh-CN' || width === 1440) {
        await page.evaluate(() => {
          for (const sheet of document.styleSheets) for (let i=0;i<sheet.cssRules.length;i++) {
            const rule = sheet.cssRules[i]
            if (rule.cssText.includes('.summary-message') && rule.cssText.includes('max-width: 60%')) {
              window.__summaryRule = { sheet, index: i, css: rule.cssText }; sheet.deleteRule(i); return
            }
          }
          throw new Error('RC v2 Summary rule missing')
        })
        const baseline = await stableScreenshot(page)
        check(current.equals(baseline), `${locale} ${width}x${height} changed frozen visual baseline`)
        record.baselinePixelIdentical = true; record.screenshotSha256 = hash(current)
        await page.evaluate(() => { const r=window.__summaryRule; r.sheet.insertRule(r.css,r.index); delete window.__summaryRule })
      }
      result.screenshots.push(record)
      console.log(`PASS ${filename}`)
    }
    await context.close()
  }
  check(result.errors.length === 0, result.errors.join('\n'))
  result.gameOriginatedUnexpected = result.requests.filter(r => r.origin === 'Game' && !r.allowed)
  check(result.gameOriginatedUnexpected.length === 0, 'Unexpected game-originated external request')
  result.pokiDownstreamStatus = 'PENDING LIVE INSPECTOR'
  result.status = 'PASS'
} catch(e) { result.status='FAIL'; result.error=e.stack; console.error(e); const p=browser.contexts().at(-1)?.pages().at(-1); if(p) await p.screenshot({path:`${out}/failure.png`,animations:'disabled'}); process.exitCode=1 }
finally { await browser.close(); h.server.kill(); await writeFile(`${out}/summary-results.json`, JSON.stringify(result,null,2)+'\n') }
