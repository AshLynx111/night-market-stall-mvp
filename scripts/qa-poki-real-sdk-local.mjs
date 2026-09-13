// Real official SDK on a local production preview. This is not Poki Inspector.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const origin = 'http://127.0.0.1:4199'
const pokiDomains = new Set(['game-cdn.poki.com', 'a.poki-cdn.com', 'geo.poki.io', 'ads.poki.com'])
const result = { environment: 'Real SDK, localhost production preview; no portal or Inspector session; third-party advertising dependencies blocked pending classification', requests: [], initiators: [], console: [], errors: [], failures: [], httpErrors: [] }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--mode', 'poki', '--host', '127.0.0.1', '--port', '4199', '--strictPort'], { stdio: 'ignore', windowsHide: true })
let browser
try {
  for (let i=0;i<100;i++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r=>setTimeout(r,100)) }
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    // Do not conceal a prohibited request: record every attempt and fail below.
    return u.origin === origin || pokiDomains.has(u.hostname) ? route.continue() : route.abort('blockedbyclient')
  })
  context.on('request', request => { const u=new URL(request.url()); result.requests.push({ request:request.url(),domain:u.host,reason:u.origin===origin?request.resourceType():'SDK dependency; inspect initiator evidence',allowed:u.origin===origin||pokiDomains.has(u.hostname) }) })
  context.on('response', r=>{if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()})})
  context.on('requestfailed', r=>result.failures.push({url:r.url(),failure:r.failure()}))
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  cdp.on('Network.requestWillBeSent', event => {
    if (!event.request.url.startsWith(origin)) result.initiators.push({ url: event.request.url, type: event.initiator.type, source: event.initiator.url, frames: event.initiator.stack?.callFrames?.slice(0,5) })
  })
  page.on('console', m=>result.console.push({type:m.type(),message:m.text()}))
  page.on('pageerror', e=>result.errors.push(e.message))
  await page.goto(origin, { waitUntil:'load', timeout:60000 })
  await page.locator('[data-ui-screen="home"]').waitFor()
  await page.waitForTimeout(4000)
  result.homeEnglish=await page.locator('html').getAttribute('lang')==='en'
  await page.getByRole('button',{name:'Start Game',exact:true}).click()
  await page.locator('[data-ui-screen="playing"]').waitFor()
  await page.locator('.gameplay-hud__control--pause').click()
  await page.locator('.menu-modal .modal-close').click()
  await page.locator('[data-platform-input-lock]').waitFor({state:'detached',timeout:20000})
  await page.locator('[data-ingredient-id="noodle"]').click()
  await page.locator('[data-slot-id="left"][data-expected-step-id="egg"]').waitFor()
  result.playableAfterResume=true
  await page.waitForTimeout(1500)
} catch(e) { result.auditError=e.stack; process.exitCode=1 }
finally {
  await browser?.close(); server.kill()
  await mkdir('docs/qa/poki-rc-v1',{recursive:true})
  await writeFile('docs/qa/poki-rc-v1/real-sdk-local.json',JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result,null,2))
  if(result.requests.some(r=>!r.allowed)||result.errors.length||result.httpErrors.length)process.exitCode=1
}
