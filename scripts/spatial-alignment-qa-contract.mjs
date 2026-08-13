export const SPATIAL_SCHEMA_VERSION = 'spatial-alignment-v2'

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
  assert(result.settings?.ranges?.length === 3, 'Settings evidence must include three ranges')
  assert(result.settings.ranges.every((range) => range.measuredVisibleThumbCount === 1), 'Every settings range must have exactly one measured visible thumb')
  for (const kind of ['sauce', 'cut', 'roll']) {
    const checkpoint = result.griddleGeometry?.find((record) => record.label === `guided-${kind}-active`)
    assert(checkpoint, `Missing active ${kind} geometry checkpoint`)
    const slot = checkpoint.slots?.find((candidate) => candidate.slotId === 'left')
    assert(slot?.gesture, `Missing active ${kind} gesture target`)
    assert(slot?.tutorial, `Missing active ${kind} tutorial cue`)
  }
  assertExactScreenshotManifest(result.screenshotManifest ?? [])
  return true
}
