export const SPATIAL_SCHEMA_VERSION = 'spatial-alignment-v3'

export const REQUIRED_SCREENSHOT_NAMES = [
  'settings.png',
  'day-1-empty.png',
  'day-1-two-griddles.png',
  'day-3.png',
  'day-5.png',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function pixelDifference(live, hidden, offset, channels) {
  let difference = 0
  for (let channel = 0; channel < Math.min(3, channels); channel += 1) {
    difference = Math.max(difference, Math.abs(live[offset + channel] - hidden[offset + channel]))
  }
  return difference
}

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

function distanceToPolygon(x, y, polygon) {
  let distance = Number.POSITIVE_INFINITY
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    distance = Math.min(distance, distanceToSegment(x, y, polygon[previous], polygon[current]))
  }
  return distance
}

export function analyzeDynamicFoodPixels({
  live,
  baseline,
  width,
  height,
  channels,
  allowedMasks,
  controlMasks = [],
  unusedMasks = [],
  threshold = 18,
  antialiasTolerance = 1,
  maxAntialiasPixels = 0,
}) {
  assert(live.length === baseline.length, 'Live and baseline screenshot buffers differ in length')
  assert(live.length === width * height * channels, 'Dynamic-food screenshot pixel buffer dimensions are inconsistent')
  assert(allowedMasks.length > 0, 'Dynamic-food acceptance requires at least one canonical allowed mask')

  const masks = allowedMasks.map((mask) => ({ id: mask.id, changedPixelCount: 0 }))
  let changedPixelCount = 0
  let outsideAllowedPixelCount = 0
  let rimChangedPixelCount = 0
  let unusedCellChangedPixelCount = 0
  let antialiasTolerancePixelCount = 0
  let bounds = null

  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * channels
    if (pixelDifference(live, baseline, offset, channels) < threshold) continue
    changedPixelCount += 1
    bounds = bounds
      ? { left: Math.min(bounds.left, x), top: Math.min(bounds.top, y), right: Math.max(bounds.right, x), bottom: Math.max(bounds.bottom, y) }
      : { left: x, top: y, right: x, bottom: y }
    const pixelX = x + .5
    const pixelY = y + .5
    const allowedIndex = allowedMasks.findIndex((mask) => pointInPolygon(pixelX, pixelY, mask.polygon))
    if (allowedIndex >= 0) {
      masks[allowedIndex].changedPixelCount += 1
      continue
    }

    const antialiasedEdge = antialiasTolerance > 0
      && allowedMasks.some((mask) => distanceToPolygon(pixelX, pixelY, mask.polygon) <= antialiasTolerance)
    if (antialiasedEdge) {
      antialiasTolerancePixelCount += 1
      continue
    }

    outsideAllowedPixelCount += 1
    if (unusedMasks.some((mask) => pointInPolygon(pixelX, pixelY, mask.polygon))) unusedCellChangedPixelCount += 1
    else if (controlMasks.some((mask) => pointInPolygon(pixelX, pixelY, mask.polygon))) rimChangedPixelCount += 1
  }

  const accepted = changedPixelCount > 0
    && masks.every((mask) => mask.changedPixelCount > 0)
    && outsideAllowedPixelCount === 0
    && rimChangedPixelCount === 0
    && unusedCellChangedPixelCount === 0
    && antialiasTolerancePixelCount <= maxAntialiasPixels

  return {
    accepted,
    changedPixelCount,
    outsideAllowedPixelCount,
    rimChangedPixelCount,
    unusedCellChangedPixelCount,
    antialiasTolerancePixelCount,
    antialiasTolerance,
    maxAntialiasPixels,
    bounds,
    masks,
  }
}

export function analyzeRangeThumbPixels({ live, hidden, width, height, channels, ranges }) {
  assert(live.length === hidden.length, 'Live and hidden screenshot buffers differ in length')
  assert(live.length === width * height * channels, 'Screenshot pixel buffer dimensions are inconsistent')

  return ranges.map((range) => {
    const left = Math.max(0, Math.floor(range.rail.left - 18))
    const right = Math.min(width - 1, Math.ceil(range.rail.right + 18))
    const top = Math.max(0, Math.floor(range.expectedThumbCenter.y - 18))
    const bottom = Math.min(height - 1, Math.ceil(range.expectedThumbCenter.y + 18))
    const railTop = Math.floor(range.rail.top) - 1
    const railBottom = Math.ceil(range.rail.bottom) + 1
    const changedByColumn = []

    for (let x = left; x <= right; x += 1) {
      let changedAbove = 0
      let changedBelow = 0
      for (let y = top; y <= bottom; y += 1) {
        if (y >= railTop && y <= railBottom) continue
        const offset = (y * width + x) * channels
        if (pixelDifference(live, hidden, offset, channels) < 18) continue
        if (y < railTop) changedAbove += 1
        if (y > railBottom) changedBelow += 1
      }
      changedByColumn.push({ x, changedAbove, changedBelow })
    }

    const runs = []
    let run = null
    for (const column of changedByColumn) {
      const thumbColumn = column.changedAbove >= 2 && column.changedBelow >= 2
      if (thumbColumn) {
        if (!run) run = { left: column.x, right: column.x, changedPixels: 0 }
        run.right = column.x
        run.changedPixels += column.changedAbove + column.changedBelow
      } else if (run) {
        runs.push(run)
        run = null
      }
    }
    if (run) runs.push(run)

    const matchedComponents = runs
      .map((candidate) => ({
        ...candidate,
        width: candidate.right - candidate.left + 1,
        centerX: (candidate.left + candidate.right) / 2,
        centerY: range.expectedThumbCenter.y,
      }))
      .filter((candidate) => candidate.width >= 12 && candidate.width <= 36 && candidate.changedPixels >= 150)

    return {
      label: range.label,
      measuredVisibleThumbCount: matchedComponents.length,
      expectedThumbCenter: range.expectedThumbCenter,
      matchedComponents,
    }
  })
}

export function assertExactScreenshotManifest(manifest) {
  const names = manifest.map((entry) => entry.name).sort()
  const expected = [...REQUIRED_SCREENSHOT_NAMES].sort()
  assert(JSON.stringify(names) === JSON.stringify(expected), `Screenshot manifest must contain exactly ${expected.join(', ')}; got ${names.join(', ')}`)
  assert(manifest.every((entry) => entry.format === 'png' && entry.width === 1440 && entry.height === 810), 'Every screenshot must be a 1440x810 PNG')
  return manifest
}

export function assertSpatialEvidenceSchema(result) {
  assert(result.schemaVersion === SPATIAL_SCHEMA_VERSION, `Spatial evidence schema must be ${SPATIAL_SCHEMA_VERSION}`)
  assert(result.browser?.name === 'Microsoft Edge' && typeof result.browser?.version === 'string' && result.browser.version.length > 0, 'Actual Microsoft Edge version is required')
  assert(result.settings?.ranges?.length === 3, 'Settings evidence must include three ranges')
  assert(result.settings.ranges.every((range) => range.measuredVisibleThumbCount === 1), 'Every settings range must have exactly one measured visible thumb')
  for (const kind of ['sauce', 'cut', 'roll']) {
    const checkpoint = result.griddleGeometry?.find((record) => record.label === `guided-${kind}-active`)
    assert(checkpoint, `Missing active ${kind} geometry checkpoint`)
    const slot = checkpoint.slots?.find((candidate) => candidate.slotId === 'left')
    assert(slot?.gesture, `Missing active ${kind} gesture target`)
    assert(slot?.tutorial, `Missing active ${kind} tutorial cue`)
  }
  for (const day of [1, 3, 5]) {
    const pixels = result.kitchenFixtures?.[`day${day}`]?.stationaryFoodPixels
    assert(pixels?.accepted === true && pixels.changedPixelCount > 0 && pixels.outsideAllowedPixelCount === 0 && pixels.rimChangedPixelCount === 0 && pixels.unusedCellChangedPixelCount === 0 && pixels.masks?.every((mask) => mask.changedPixelCount > 0), `Day ${day} dynamic food pixels failed canonical inner-mask acceptance`)
  }
  const drag = result.dragGhost
  assert(drag?.accepted === true && drag.changedPixelCount > 0 && drag.outsideAllowedPixelCount === 0 && drag.rimChangedPixelCount === 0 && drag.unusedCellChangedPixelCount === 0 && drag.masks?.every((mask) => mask.changedPixelCount > 0), 'Active ingredient drag ghost failed canonical inner-mask acceptance')
  assertExactScreenshotManifest(result.screenshotManifest ?? [])
  return true
}
