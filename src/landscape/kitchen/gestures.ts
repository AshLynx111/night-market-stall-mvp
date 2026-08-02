import type { Point, Rect } from '../geometry'
import { calculateCoverageMetrics, clamp, interpolateSegment, isPointInRect, markCoverageCells } from '../geometry'

const SAUCE_COLUMNS = 10
const SAUCE_ROWS = 6
const CUT_TARGETS = [0.3, 0.5, 0.7]

export interface SauceGestureResult {
  kind: 'sauce'
  coverage: number
  uniformity: number
  complete: boolean
}

export interface CutGestureResult {
  kind: 'cut'
  targetIndex: number | null
  accuracy: number
  progress: number
  verticalDeviation: number
  complete: boolean
}

export interface RollGestureResult {
  kind: 'roll'
  progress: number
  verticalDeviation: number
  complete: boolean
}

export type GestureResult = SauceGestureResult | CutGestureResult | RollGestureResult

function validRect(rect: Rect) {
  return rect.width > 0 && rect.height > 0
}

function clipSegmentToRect(from: Point, to: Point, rect: Rect): [Point, Point] | null {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const boundaries = [
    [-deltaX, from.x - rect.x],
    [deltaX, rect.x + rect.width - from.x],
    [-deltaY, from.y - rect.y],
    [deltaY, rect.y + rect.height - from.y],
  ]
  let start = 0
  let end = 1

  for (const [direction, distance] of boundaries) {
    if (direction === 0) {
      if (distance < 0) return null
      continue
    }
    const ratio = distance / direction
    if (direction < 0) start = Math.max(start, ratio)
    else end = Math.min(end, ratio)
    if (start > end) return null
  }

  return [
    { x: from.x + deltaX * start, y: from.y + deltaY * start },
    { x: from.x + deltaX * end, y: from.y + deltaY * end },
  ]
}

function pointsOnFood(path: Point[], rect: Rect) {
  const finitePath = path.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
  if (finitePath.length === 1) return isPointInRect(finitePath[0], rect) ? finitePath : []

  const clipped: Point[] = []
  for (let index = 1; index < finitePath.length; index += 1) {
    const segment = clipSegmentToRect(finitePath[index - 1], finitePath[index], rect)
    if (segment) clipped.push(...segment)
  }
  return clipped
}

export function measureSauce(path: Point[], rect: Rect): SauceGestureResult {
  if (!validRect(rect) || path.length === 0) {
    return { kind: 'sauce', coverage: 0, uniformity: 0, complete: false }
  }

  const covered = new Set<number>()
  const spacing = Math.min(rect.width / SAUCE_COLUMNS, rect.height / SAUCE_ROWS) / 2
  const sampled = [path[0]]
  for (let index = 1; index < path.length; index += 1) {
    sampled.push(...interpolateSegment(path[index - 1], path[index], spacing))
  }
  for (const point of sampled) {
    const next = markCoverageCells(covered, point, rect, SAUCE_COLUMNS, SAUCE_ROWS, 0)
    for (const cell of next) covered.add(cell)
  }

  const { coverage, uniformity } = calculateCoverageMetrics(covered, SAUCE_COLUMNS, SAUCE_ROWS)
  return { kind: 'sauce', coverage, uniformity, complete: coverage >= 0.6 }
}

export function measureCut(
  path: Point[],
  rect: Rect,
  previousCuts: Array<number | Pick<CutGestureResult, 'targetIndex'>>,
): CutGestureResult {
  const rejected: CutGestureResult = {
    kind: 'cut', targetIndex: null, accuracy: 0, progress: 0, verticalDeviation: 1, complete: false,
  }
  if (!validRect(rect)) return rejected
  const points = pointsOnFood(path, rect)
  if (points.length < 2) return rejected

  const horizontalTravel = clamp(
    (Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x))) / rect.width,
  )
  const verticalDeviation = clamp(
    (Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y))) / rect.height,
  )
  const averageY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const completedTargets = new Set(previousCuts.flatMap((cut) => {
    const targetIndex = typeof cut === 'number' ? cut : cut.targetIndex
    return targetIndex === null ? [] : [targetIndex]
  }))
  const match = CUT_TARGETS
    .map((ratio, targetIndex) => ({
      targetIndex,
      positionError: Math.abs(averageY - (rect.y + rect.height * ratio)) / rect.height,
    }))
    .filter(({ targetIndex }) => !completedTargets.has(targetIndex))
    .sort((a, b) => a.positionError - b.positionError)[0]

  if (!match) return { ...rejected, progress: horizontalTravel, verticalDeviation }
  const complete = horizontalTravel >= 0.55 && verticalDeviation <= 0.15 && match.positionError <= 0.15
  const accuracy = complete
    ? clamp(1 - (match.positionError / 0.15) * 0.7 - (verticalDeviation / 0.15) * 0.3)
    : 0
  return {
    kind: 'cut',
    targetIndex: complete ? match.targetIndex : null,
    accuracy,
    progress: horizontalTravel,
    verticalDeviation,
    complete,
  }
}

export function measureRoll(path: Point[], rect: Rect): RollGestureResult {
  if (!validRect(rect)) return { kind: 'roll', progress: 0, verticalDeviation: 1, complete: false }
  const points = pointsOnFood(path, rect)
  if (points.length < 2) return { kind: 'roll', progress: 0, verticalDeviation: 0, complete: false }

  const progress = clamp(
    (Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x))) / rect.width,
  )
  const verticalDeviation = clamp(
    (Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y))) / rect.height,
  )
  return { kind: 'roll', progress, verticalDeviation, complete: progress >= 0.75 && verticalDeviation < 0.3 }
}
