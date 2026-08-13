import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  REQUIRED_SCREENSHOT_NAMES,
  SPATIAL_SCHEMA_VERSION,
  analyzeDynamicFoodPixels,
  analyzeRangeThumbPixels,
  assertExactScreenshotManifest,
  assertSpatialEvidenceSchema,
} from './spatial-alignment-qa-contract.mjs'

function syntheticFoodImage({ changed = [[4, 4]], width = 12, height = 12 } = {}) {
  const channels = 3
  const baseline = new Uint8Array(width * height * channels)
  const live = new Uint8Array(baseline)
  for (const [x, y] of changed) {
    const offset = (y * width + x) * channels
    live[offset] = 255
    live[offset + 1] = 180
    live[offset + 2] = 90
  }
  return {
    live,
    baseline,
    width,
    height,
    channels,
    threshold: 18,
    antialiasTolerance: 0,
    maxAntialiasPixels: 0,
    allowedMasks: [{ id: 'active', polygon: [{ x: 3, y: 3 }, { x: 8, y: 3 }, { x: 8, y: 8 }, { x: 3, y: 8 }] }],
    controlMasks: [{ id: 'active', polygon: [{ x: 1, y: 1 }, { x: 10, y: 1 }, { x: 10, y: 10 }, { x: 1, y: 10 }] }],
    unusedMasks: [{ id: 'unused', polygon: [{ x: 9, y: 1 }, { x: 11, y: 1 }, { x: 11, y: 3 }, { x: 9, y: 3 }] }],
  }
}

function syntheticThumbImage(thumbCenters, { edgeNoise = false } = {}) {
  const width = 120
  const height = 40
  const channels = 3
  const hidden = new Uint8Array(width * height * channels)
  const live = new Uint8Array(hidden)
  const paint = (left, top, right, bottom, value = 255) => {
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
      const offset = (y * width + x) * channels
      live[offset] = value
      live[offset + 1] = value
      live[offset + 2] = value
    }
  }
  paint(10, 17, 110, 23, 120)
  for (const centerX of thumbCenters) paint(centerX - 6, 8, centerX + 7, 32)
  if (edgeNoise) paint(10, 8, 20, 32)
  return {
    live,
    hidden,
    width,
    height,
    channels,
    ranges: [{
      label: 'synthetic',
      rail: { left: 10, top: 17, right: 110, bottom: 23, width: 100, height: 6 },
      expectedThumbCenter: { x: thumbCenters[0] ?? 30, y: 20 },
    }],
  }
}

function validManifest() {
  return REQUIRED_SCREENSHOT_NAMES.map((name) => ({ name, width: 1440, height: 810, format: 'png' }))
}

function validEvidence() {
  const geometry = ['guided-sauce-active', 'guided-cut-active', 'guided-roll-active'].map((label) => ({
    label,
    slots: [{ slotId: 'left', gesture: {}, tutorial: {}, gestureRectDelta: { x: 0, y: 0, width: 0, height: 0 }, tutorialRectDelta: { x: 0, y: 0, width: 0, height: 0 } }],
  }))
  return {
    schemaVersion: SPATIAL_SCHEMA_VERSION,
    browser: { name: 'Microsoft Edge', version: '140.0.0.0' },
    settings: { ranges: [0, .5, 1].map((value) => ({ value, measuredVisibleThumbCount: 1 })) },
    griddleGeometry: geometry,
    kitchenFixtures: Object.fromEntries([1, 3, 5].map((day) => [`day${day}`, {
      rackBackground: day === 1 ? 'approved-2x3' : 'expanded-3x5',
      physicalWellCount: day === 1 ? 6 : 15,
      backgroundSource: day === 1 ? 'kitchen-screen-live-clean.png' : 'kitchen-screen-live-expanded-clean.png',
      rackControlPolygons: Array.from({ length: day === 1 ? 6 : 15 }, () => []),
      bins: Array.from({ length: day === 1 ? 5 : day === 3 ? 11 : 15 }, () => ({ physicalWellMapped: true })),
      stationaryFoodPixels: {
        accepted: true,
        changedPixelCount: 100,
        outsideAllowedPixelCount: 0,
        rimChangedPixelCount: 0,
        unusedCellChangedPixelCount: 0,
        antialiasTolerancePixelCount: 0,
        masks: [{ id: 'food', changedPixelCount: 100 }],
      },
    }])),
    dragGhost: {
      accepted: true,
      changedPixelCount: 100,
      outsideAllowedPixelCount: 0,
      rimChangedPixelCount: 0,
      unusedCellChangedPixelCount: 0,
      antialiasTolerancePixelCount: 0,
      masks: [{ id: 'ghost', changedPixelCount: 100 }],
    },
    screenshotManifest: validManifest(),
  }
}

describe('spatial alignment QA evidence contract', () => {
  it('measures one visible thumb component from live-versus-hidden pixels', () => {
    const [measurement] = analyzeRangeThumbPixels(syntheticThumbImage([30]))
    expect(measurement.measuredVisibleThumbCount).toBe(1)
    expect(measurement.matchedComponents[0].centerX).toBe(30)
  })

  it('rejects a second visible thumb instead of hard-coding one', () => {
    const measurement = analyzeRangeThumbPixels(syntheticThumbImage([30, 80]))[0]
    expect(measurement.measuredVisibleThumbCount).toBe(2)
  })

  it('excludes narrow focus-edge noise from the visible thumb count', () => {
    const measurement = analyzeRangeThumbPixels(syntheticThumbImage([80], { edgeNoise: true }))[0]
    expect(measurement.measuredVisibleThumbCount).toBe(1)
    expect(measurement.matchedComponents[0].centerX).toBe(80)
  })

  it('accepts live food pixels only when a non-empty diff stays inside the canonical inner mask', () => {
    const measurement = analyzeDynamicFoodPixels(syntheticFoodImage())

    expect(measurement).toMatchObject({
      accepted: true,
      changedPixelCount: 1,
      outsideAllowedPixelCount: 0,
      rimChangedPixelCount: 0,
      unusedCellChangedPixelCount: 0,
    })
    expect(measurement.masks).toEqual([{ id: 'active', changedPixelCount: 1 }])
  })

  it.each([
    ['rim', [2, 5], 'rimChangedPixelCount'],
    ['unused cell', [10, 2], 'unusedCellChangedPixelCount'],
    ['outside', [0, 11], 'outsideAllowedPixelCount'],
  ])('rejects a changed %s pixel instead of intersecting it away', (_label, point, countField) => {
    const measurement = analyzeDynamicFoodPixels(syntheticFoodImage({ changed: [point] }))

    expect(measurement.accepted).toBe(false)
    expect(measurement[countField]).toBeGreaterThan(0)
  })

  it('rejects an empty live-versus-baseline comparison', () => {
    const measurement = analyzeDynamicFoodPixels(syntheticFoodImage({ changed: [] }))

    expect(measurement.accepted).toBe(false)
    expect(measurement.changedPixelCount).toBe(0)
  })

  it('requires exactly the five normalized 1440x810 PNG captures', () => {
    expect(assertExactScreenshotManifest(validManifest())).toEqual(validManifest())
    expect(() => assertExactScreenshotManifest([...validManifest(), { name: 'stale.png', width: 1440, height: 810, format: 'png' }])).toThrow(/manifest/i)
    expect(() => assertExactScreenshotManifest(validManifest().map((entry, index) => index === 0 ? { ...entry, width: 1439 } : entry))).toThrow(/1440x810/i)
  })

  it('requires measured thumbs and active gesture plus tutorial nodes for sauce, cut, and roll', () => {
    expect(assertSpatialEvidenceSchema(validEvidence())).toBe(true)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), schemaVersion: 'spatial-alignment-v1' })).toThrow(/schema/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), browser: { name: 'Microsoft Edge', version: '' } })).toThrow(/Edge version/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), settings: { ranges: [0, .5, 1].map((value) => ({ value, claimedThumbCount: 1 })) } })).toThrow(/measured/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), griddleGeometry: validEvidence().griddleGeometry.slice(1) })).toThrow(/sauce/i)
    const missingTutorial = validEvidence()
    missingTutorial.griddleGeometry[1].slots[0].tutorial = null
    expect(() => assertSpatialEvidenceSchema(missingTutorial)).toThrow(/tutorial/i)
    const missingGesture = validEvidence()
    missingGesture.griddleGeometry[2].slots[0].gesture = null
    expect(() => assertSpatialEvidenceSchema(missingGesture)).toThrow(/gesture/i)
    const leakedFood = validEvidence()
    leakedFood.kitchenFixtures.day3.stationaryFoodPixels = { ...leakedFood.kitchenFixtures.day3.stationaryFoodPixels, accepted: false, rimChangedPixelCount: 1 }
    expect(() => assertSpatialEvidenceSchema(leakedFood)).toThrow(/food pixels/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), dragGhost: { ...validEvidence().dragGhost, accepted: false } })).toThrow(/drag ghost/i)
    const wrongBackground = validEvidence()
    wrongBackground.kitchenFixtures.day5.rackBackground = 'approved-2x3'
    expect(() => assertSpatialEvidenceSchema(wrongBackground)).toThrow(/expanded-3x5/i)
    const looseIngredient = validEvidence()
    looseIngredient.kitchenFixtures.day5.bins[14].physicalWellMapped = false
    expect(() => assertSpatialEvidenceSchema(looseIngredient)).toThrow(/physical steel well/i)
  })

  it('uses the pinned project Playwright package and contains no tautological visible-food intersection proof', () => {
    const runner = readFileSync('scripts/current-reference-screens-qa.mjs', 'utf8')
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

    expect(runner).toContain("from 'playwright'")
    expect(runner).not.toMatch(/visibleFoodRect\s*=\s*intersect/)
    expect(runner).toMatch(/data-qa-freeze[\s\S]+data-qa-hide-drag-ghost[\s\S]+baselineBuffer[\s\S]+liveBuffer/)
    expect(packageJson.devDependencies.playwright).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
