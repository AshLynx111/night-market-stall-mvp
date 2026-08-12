import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'file:///C:/Users/qianwu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'

const root = process.cwd()
const outputDir = path.join(root, 'artifacts', 'task-6-kitchen-composition')
await mkdir(outputDir, { recursive: true })
const preview = spawn(process.execPath, [
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
  '--host', '127.0.0.1', '--port', '53786', '--strictPort',
], { cwd: root, stdio: 'ignore', windowsHide: true })

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
for (let attempt = 0; attempt < 100; attempt += 1) {
  try { if ((await fetch('http://127.0.0.1:53786/')).ok) break } catch { /* retry */ }
  await delay(100)
}

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1 })
const consoleErrors = []
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
await page.addInitScript(() => {
  localStorage.setItem('night-market-guided-tutorial-v2', 'true')
  localStorage.setItem('night-market-campaign-v1', JSON.stringify({
    coins: 236, highestUnlockedDay: 6, completedDays: {}, fireLevel: 1, signLevel: 1,
  }))
})

const snapshots = []
async function capture(name) {
  await page.locator('.kitchen-scene').waitFor()
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 45_000 })
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) })
  snapshots.push(await page.evaluate((label) => {
    const rect = (node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } }
    const overlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
    const actors = [...document.querySelectorAll('[data-customer-id]')].map((node) => {
      const actorRect = rect(node)
      return {
        id: node.dataset.customerId,
        phase: node.dataset.customerMotionPhase,
        rect: actorRect,
        faceRect: {
          x: actorRect.x + actorRect.width * .28,
          y: actorRect.y + actorRect.height * .25,
          width: actorRect.width * .44,
          height: actorRect.height * .27,
          right: actorRect.x + actorRect.width * .72,
          bottom: actorRect.y + actorRect.height * .52,
        },
      }
    })
    const bubbles = [...document.querySelectorAll('[data-customer-bubble-for]')].map((node) => ({ id: node.dataset.customerBubbleFor, rect: rect(node) }))
    return {
      label,
      composition: document.querySelector('.kitchen-scene')?.dataset.kitchenComposition,
      livePlateCount: document.querySelectorAll('[data-kitchen-live-plate]').length,
      livePlateSource: document.querySelector('[data-kitchen-live-plate]')?.getAttribute('src') ?? '',
      bakedCustomerCount: document.querySelectorAll('[data-baked-customer]').length,
      laneAnchors: [...document.querySelectorAll('[data-customer-lane-anchor]')].map((node) => ({ lane: node.dataset.customerLaneAnchor, clear: node.dataset.bubbleFaceClearance ?? null })),
      actors,
      bubbles,
      bubbleActorOverlaps: bubbles.map((bubble) => {
        const actor = actors.find((candidate) => candidate.id === bubble.id)
        return { bubble: bubble.id, actor: actor?.id ?? null, overlaps: actor ? overlap(bubble.rect, actor.faceRect) : true }
      }),
      griddles: [...document.querySelectorAll('[data-griddle-hitbox]')].map((node) => ({ id: node.dataset.griddleHitbox, rect: rect(node), stageImages: node.querySelectorAll('.griddle-slot__stage-art').length })),
      bins: [...document.querySelectorAll('[data-ingredient-id]')].map((node) => ({ id: node.dataset.ingredientId, images: node.querySelectorAll(':scope > img.table-ingredient__bin-art').length, rect: rect(node) })),
    }
  }, name))
}

async function dispatch(action) {
  await page.locator('.kitchen-scene').evaluate((root, nextAction) => {
    const key = Object.keys(root).find((candidate) => candidate.startsWith('__reactFiber$'))
    let fiberRoot = key ? root[key] : null
    while (fiberRoot?.return) fiberRoot = fiberRoot.return
    const stack = [fiberRoot?.stateNode?.current ?? fiberRoot].filter(Boolean)
    while (stack.length) {
      const candidate = stack.pop()
      if (candidate.elementType?.name === 'KitchenScene') {
        candidate.memoizedProps.dispatch(nextAction)
        return
      }
      if (candidate.sibling) stack.push(candidate.sibling)
      if (candidate.child) stack.push(candidate.child)
    }
    throw new Error('KitchenScene dispatch unavailable')
  }, action)
  await page.waitForTimeout(80)
}

try {
  await page.goto('http://127.0.0.1:53786/?playDay=1', { waitUntil: 'networkidle', timeout: 60_000 })
  await capture('01-entry')
  await page.waitForTimeout(2_700)
  await capture('02-three-active-day1-bins')
  await dispatch({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'noodle' })
  await dispatch({ type: 'TAP_EGG', slotId: 'left' })
  await dispatch({ type: 'TICK', deltaMs: 4_000 })
  await dispatch({ type: 'DROP_INGREDIENT', slotId: 'left', ingredient: 'hot-dog' })
  await dispatch({ type: 'DROP_INGREDIENT', slotId: 'right', ingredient: 'noodle' })
  await capture('03-two-griddles-cooking-stages')
  await dispatch({ type: 'TICK', deltaMs: 90_000 })
  await capture('04-leaving')

  const active = snapshots.find((record) => record.label === '02-three-active-day1-bins')
  const cooking = snapshots.find((record) => record.label === '03-two-griddles-cooking-stages')
  if (active.actors.filter((actor) => actor.phase === 'active').length !== 3) throw new Error('Expected three active dynamic customers')
  if (active.bakedCustomerCount !== 0 || active.livePlateCount !== 1 || !active.livePlateSource.includes('kitchen-screen-live-clean')) throw new Error('Approved derivative masking contract failed')
  if (active.bubbles.length !== 3 || active.bubbleActorOverlaps.some((item) => item.overlaps)) throw new Error('Order bubble overlaps a live customer')
  if (active.bins.length !== 4 || active.bins.some((bin) => bin.images !== 1)) throw new Error('Day 1 ingredient bins are not complete single-image controls')
  if (cooking.griddles.length !== 2 || cooking.griddles.some((griddle) => griddle.stageImages !== 1)) throw new Error('Both griddles did not retain cumulative cooking stages')
  await writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify({ viewport: [1440, 810], consoleErrors, snapshots }, null, 2)}\n`)
  process.stdout.write(`Task 6 Edge QA passed: ${snapshots.length} checkpoints\n`)
} finally {
  await browser.close()
  preview.kill()
}
