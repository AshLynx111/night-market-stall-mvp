import { describe, expect, it } from 'vitest'
import {
  REQUIRED_SCREENSHOT_NAMES,
  SPATIAL_SCHEMA_VERSION,
  analyzeRangeThumbPixels,
  assertExactScreenshotManifest,
  assertSpatialEvidenceSchema,
} from './spatial-alignment-qa-contract.mjs'

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
    settings: { ranges: [0, .5, 1].map((value) => ({ value, measuredVisibleThumbCount: 1 })) },
    griddleGeometry: geometry,
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

  it('requires exactly the five normalized 1440x810 PNG captures', () => {
    expect(assertExactScreenshotManifest(validManifest())).toEqual(validManifest())
    expect(() => assertExactScreenshotManifest([...validManifest(), { name: 'stale.png', width: 1440, height: 810, format: 'png' }])).toThrow(/manifest/i)
    expect(() => assertExactScreenshotManifest(validManifest().map((entry, index) => index === 0 ? { ...entry, width: 1439 } : entry))).toThrow(/1440x810/i)
  })

  it('requires measured thumbs and active gesture plus tutorial nodes for sauce, cut, and roll', () => {
    expect(assertSpatialEvidenceSchema(validEvidence())).toBe(true)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), schemaVersion: 'spatial-alignment-v1' })).toThrow(/schema/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), settings: { ranges: [0, .5, 1].map((value) => ({ value, claimedThumbCount: 1 })) } })).toThrow(/measured/i)
    expect(() => assertSpatialEvidenceSchema({ ...validEvidence(), griddleGeometry: validEvidence().griddleGeometry.slice(1) })).toThrow(/sauce/i)
    const missingTutorial = validEvidence()
    missingTutorial.griddleGeometry[1].slots[0].tutorial = null
    expect(() => assertSpatialEvidenceSchema(missingTutorial)).toThrow(/tutorial/i)
    const missingGesture = validEvidence()
    missingGesture.griddleGeometry[2].slots[0].gesture = null
    expect(() => assertSpatialEvidenceSchema(missingGesture)).toThrow(/gesture/i)
  })
})
