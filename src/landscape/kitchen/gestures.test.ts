import { describe, expect, it } from 'vitest'
import type { Point, Rect } from '../geometry'
import { measureCut, measureRoll, measureSauce } from './gestures'

const rect: Rect = { x: 100, y: 200, width: 800, height: 400 }

function sauceGridPath(): Point[] {
  const points: Point[] = []
  for (let row = 0; row < 6; row += 1) {
    const columns = Array.from({ length: 10 }, (_, column) => column)
    if (row % 2 === 1) columns.reverse()
    for (const column of columns) {
      points.push({
        x: rect.x + ((column + 0.5) / 10) * rect.width,
        y: rect.y + ((row + 0.5) / 6) * rect.height,
      })
    }
  }
  return points
}

describe('gesture metrics', () => {
  it('accepts one broad horizontal sauce stroke without requiring a winding grid path', () => {
    const result = measureSauce([
      { x: rect.x + rect.width * 0.15, y: rect.y + rect.height * 0.45 },
      { x: rect.x + rect.width * 0.75, y: rect.y + rect.height * 0.5 },
    ], rect)

    expect(result.coverage).toBeGreaterThanOrEqual(0.45)
    expect(result.uniformity).toBeGreaterThan(0)
    expect(result.complete).toBe(true)
  })

  it('rejects a tap or mostly vertical sauce stroke', () => {
    expect(measureSauce([{ x: 300, y: 300 }, { x: 305, y: 303 }], rect).complete).toBe(false)
    expect(measureSauce([{ x: 300, y: 220 }, { x: 340, y: 560 }], rect).complete).toBe(false)
  })

  it('recognizes distinct horizontal cuts near thirty, fifty, and seventy percent height', () => {
    const cuts: number[] = []
    for (const ratio of [0.3, 0.5, 0.7]) {
      const result = measureCut([
        { x: rect.x, y: rect.y + rect.height * ratio },
        { x: rect.x + rect.width, y: rect.y + rect.height * ratio },
      ], rect, cuts)
      expect(result.complete).toBe(true)
      expect(result.targetIndex).not.toBeNull()
      cuts.push(result.targetIndex!)
    }

    expect(cuts).toEqual([0, 1, 2])
  })

  it('clips a horizontal cut whose endpoints are both outside the food rectangle', () => {
    const result = measureCut([
      { x: rect.x - 200, y: rect.y + rect.height * 0.3 },
      { x: rect.x + rect.width + 200, y: rect.y + rect.height * 0.3 },
    ], rect, [])

    expect(result).toMatchObject({ complete: true, targetIndex: 0, progress: 1 })
  })

  it('rejects short and primarily vertical cuts', () => {
    expect(measureCut([
      { x: 100, y: 320 },
      { x: 300, y: 320 },
    ], rect, []).complete).toBe(false)
    expect(measureCut([
      { x: 300, y: 250 },
      { x: 320, y: 550 },
    ], rect, []).complete).toBe(false)
  })

  it('completes one short rightward roll swipe and rejects reverse, taps, or vertical paths', () => {
    const right = measureRoll([
      { x: rect.x + rect.width * 0.2, y: rect.y + rect.height * 0.5 },
      { x: rect.x + rect.width * 0.52, y: rect.y + rect.height * 0.54 },
    ], rect)
    expect(right.progress).toBeGreaterThanOrEqual(0.3)
    expect(right.complete).toBe(true)
    expect(measureRoll([
      { x: rect.x + rect.width * 0.7, y: rect.y + rect.height * 0.5 },
      { x: rect.x + rect.width * 0.35, y: rect.y + rect.height * 0.5 },
    ], rect).complete).toBe(false)
    expect(measureRoll([{ x: 100, y: 200 }, { x: 150, y: 600 }], rect).complete).toBe(false)
    expect(measureRoll([{ x: 200, y: 300 }, { x: 205, y: 303 }], rect).complete).toBe(false)
  })

  it('clips a horizontal roll whose endpoints are both outside the food rectangle', () => {
    const result = measureRoll([
      { x: rect.x - 100, y: rect.y + rect.height * 0.5 },
      { x: rect.x + rect.width + 100, y: rect.y + rect.height * 0.5 },
    ], rect)

    expect(result).toMatchObject({ complete: true, progress: 1 })
  })
})
