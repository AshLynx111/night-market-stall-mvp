import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import sharp from 'sharp'

export const approvedPath = 'src/assets/approved/main-ui/kitchen-screen-user-final.png'
export const cleanPath = 'src/assets/art-source/kitchen-live-inpaint-source.png'
export const emptyBinsPath = 'src/assets/art-source/kitchen-empty-bins-imagegen-source.png'
export const expandedRackSourcePath = 'src/assets/art-source/kitchen-expanded-rack-imagegen-source.png'
export const outputPath = 'src/assets/approved/main-ui/kitchen-screen-live-clean.png'
export const expandedOutputPath = 'src/assets/approved/main-ui/kitchen-screen-live-expanded-clean.png'

const OUTPUT_WIDTH = 1672
const OUTPUT_HEIGHT = 941

export const MASK_RECTS = [
  { left: 570, top: 120, width: 210, height: 190 },
  { left: 740, top: 120, width: 220, height: 190 },
  { left: 1120, top: 120, width: 220, height: 190 },
  { left: 320, top: 205, width: 235, height: 330 },
  { left: 665, top: 205, width: 310, height: 330 },
  { left: 1050, top: 205, width: 280, height: 330 },
]

// Only the six food-bearing floor planes are replaced. The approved steel
// rims, dividers, counter, HUD, griddles, and every pixel outside these
// polygons remain byte-for-byte derived from the approved live plate.
export const EMPTY_BIN_INTERIOR_POLYGONS = [
  [{ x: 150, y: 554 }, { x: 305, y: 554 }, { x: 293, y: 623 }, { x: 133, y: 621 }],
  [{ x: 321, y: 554 }, { x: 462, y: 556 }, { x: 447, y: 625 }, { x: 301, y: 622 }],
  [{ x: 125, y: 634 }, { x: 290, y: 636 }, { x: 274, y: 725 }, { x: 94, y: 722 }],
  [{ x: 296, y: 636 }, { x: 447, y: 638 }, { x: 429, y: 721 }, { x: 273, y: 717 }],
  [{ x: 96, y: 729 }, { x: 268, y: 732 }, { x: 245, y: 813 }, { x: 61, y: 807 }],
  [{ x: 274, y: 731 }, { x: 431, y: 734 }, { x: 411, y: 816 }, { x: 250, y: 811 }],
]

// The accepted ImageGen edit is intentionally not used as a whole-screen
// replacement. This measured contour follows only the new physical rack and
// leaves the HUD, market, utensils, counter, and both griddles on the approved
// deterministic Day 1 plate unchanged.
export const EXPANDED_RACK_COMPOSITE_POLYGON = [
  { x: 12, y: 856 },
  { x: 22, y: 772 },
  { x: 167, y: 545 },
  { x: 190, y: 539 },
  { x: 351, y: 540 },
  { x: 462, y: 542 },
  { x: 484, y: 549 },
  { x: 443, y: 774 },
  { x: 416, y: 859 },
  { x: 390, y: 875 },
  { x: 33, y: 867 },
]

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current]
    const b = polygon[previous]
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function distanceToSegment(x, y, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared))
  return Math.hypot(x - (start.x + ratio * dx), y - (start.y + ratio * dy))
}

function polygonPatch(polygon, feather = 3) {
  const left = Math.floor(Math.min(...polygon.map((point) => point.x)))
  const top = Math.floor(Math.min(...polygon.map((point) => point.y)))
  const right = Math.ceil(Math.max(...polygon.map((point) => point.x)))
  const bottom = Math.ceil(Math.max(...polygon.map((point) => point.y)))
  const width = right - left
  const height = bottom - top
  const alpha = Buffer.alloc(width * height)
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sceneX = left + x + .5
    const sceneY = top + y + .5
    if (!pointInPolygon(sceneX, sceneY, polygon)) continue
    let edgeDistance = Number.POSITIVE_INFINITY
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
      edgeDistance = Math.min(edgeDistance, distanceToSegment(sceneX, sceneY, polygon[previous], polygon[current]))
    }
    alpha[y * width + x] = Math.round(255 * Math.min(1, edgeDistance / feather))
  }
  return { left, top, width, height, alpha }
}

async function customerCleanPlate() {
  const base = await sharp(approvedPath).png().toBuffer()
  const clean = await sharp(cleanPath).png().toBuffer()
  const overlays = []

  for (const rect of MASK_RECTS) {
    const patch = await sharp(clean).extract(rect).png().toBuffer()
    const feather = 2
    const alpha = Buffer.alloc(rect.width * rect.height)
    for (let y = 0; y < rect.height; y += 1) for (let x = 0; x < rect.width; x += 1) {
      const edgeDistance = Math.min(x, y, rect.width - 1 - x, rect.height - 1 - y)
      alpha[y * rect.width + x] = Math.round(255 * Math.min(1, edgeDistance / feather))
    }
    const feathered = await sharp(patch).joinChannel(alpha, { raw: { width: rect.width, height: rect.height, channels: 1 } }).png().toBuffer()
    overlays.push({ input: feathered, left: rect.left, top: rect.top })
  }
  return sharp(base).composite(overlays).png({ compressionLevel: 9 }).toBuffer()
}

async function liveKitchenPlateBuffer({ includeEmptyBins = true } = {}) {
  const customerCleaned = await customerCleanPlate()
  if (!includeEmptyBins) return sharp(customerCleaned).png({ compressionLevel: 9 }).toBuffer()

  const emptyBins = await sharp(emptyBinsPath).resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'fill' }).png().toBuffer()
  const overlays = []

  for (const polygon of EMPTY_BIN_INTERIOR_POLYGONS) {
    const { left, top, width, height, alpha } = polygonPatch(polygon)
    const patch = await sharp(emptyBins).extract({ left, top, width, height }).joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer()
    overlays.push({ input: patch, left, top })
  }

  return sharp(customerCleaned).composite(overlays).png({ compressionLevel: 9 }).toBuffer()
}

export async function buildLiveKitchenPlate({ output = outputPath, includeEmptyBins = true } = {}) {
  await sharp(await liveKitchenPlateBuffer({ includeEmptyBins })).png({ compressionLevel: 9 }).toFile(output)
  return output
}

export async function buildExpandedKitchenPlate({ output = expandedOutputPath } = {}) {
  const base = await liveKitchenPlateBuffer()
  const acceptedEdit = await sharp(expandedRackSourcePath)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer()
  const { left, top, width, height, alpha } = polygonPatch(EXPANDED_RACK_COMPOSITE_POLYGON, 2)
  const patch = await sharp(acceptedEdit)
    .extract({ left, top, width, height })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()

  await sharp(base)
    .composite([{ input: patch, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(output)
  return output
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const builtPath = await buildLiveKitchenPlate()
  const builtExpandedPath = await buildExpandedKitchenPlate()
  process.stdout.write(`${builtPath}\n${builtExpandedPath}\n`)
}
