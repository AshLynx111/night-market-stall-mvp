export interface Point {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const LOGICAL_SCENE_WIDTH = 1_440
export const LOGICAL_SCENE_HEIGHT = 810

export interface CutEvaluation {
  targetIndex: number
  accuracy: number
  angleError: number
  positionError: number
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function toLogicalPoint(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  logicalWidth: number,
  logicalHeight: number,
): Point {
  return {
    x: ((clientX - bounds.left) / bounds.width) * logicalWidth,
    y: ((clientY - bounds.top) / bounds.height) * logicalHeight,
  }
}

export function toLogicalScenePoint(element: Element, clientX: number, clientY: number): Point {
  const scene = element.closest<HTMLElement>('.kitchen-scene')
  if (!scene) return { x: clientX, y: clientY }
  const bounds = scene.getBoundingClientRect()
  return toLogicalPoint(clientX, clientY, {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width || LOGICAL_SCENE_WIDTH,
    height: bounds.height || LOGICAL_SCENE_HEIGHT,
  }, LOGICAL_SCENE_WIDTH, LOGICAL_SCENE_HEIGHT)
}

export function expandRect(rect: Rect, ratio: number): Rect {
  const xGrowth = rect.width * ratio
  const yGrowth = rect.height * ratio
  return {
    x: rect.x - xGrowth,
    y: rect.y - yGrowth,
    width: rect.width + xGrowth * 2,
    height: rect.height + yGrowth * 2,
  }
}

export function isPointInRect(point: Point, rect: Rect) {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height
}

export function markCoverageCells(
  covered: Set<number>,
  point: Point,
  surface: Rect,
  columns: number,
  rows: number,
  brushRadius = 1,
) {
  if (!isPointInRect(point, surface)) return new Set(covered)
  const next = new Set(covered)
  const column = Math.min(columns - 1, Math.floor(((point.x - surface.x) / surface.width) * columns))
  const row = Math.min(rows - 1, Math.floor(((point.y - surface.y) / surface.height) * rows))

  for (let y = -brushRadius; y <= brushRadius; y += 1) {
    for (let x = -brushRadius; x <= brushRadius; x += 1) {
      if (Math.hypot(x, y) > brushRadius + 0.25) continue
      const targetColumn = column + x
      const targetRow = row + y
      if (targetColumn < 0 || targetColumn >= columns || targetRow < 0 || targetRow >= rows) continue
      next.add(targetRow * columns + targetColumn)
    }
  }
  return next
}

export function calculateCoverageMetrics(covered: Set<number>, columns: number, rows: number) {
  const total = columns * rows
  const coverage = covered.size / total
  const quadrantCounts = [0, 0, 0, 0]
  const quadrantTotals = [0, 0, 0, 0]

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const quadrant = (row < rows / 2 ? 0 : 2) + (column < columns / 2 ? 0 : 1)
      quadrantTotals[quadrant] += 1
      if (covered.has(row * columns + column)) quadrantCounts[quadrant] += 1
    }
  }

  const ratios = quadrantCounts.map((count, index) => count / quadrantTotals[index])
  const uniformity = clamp(1 - (Math.max(...ratios) - Math.min(...ratios)))
  return { coverage, uniformity }
}

export function interpolateSegment(from: Point, to: Point, spacing = 12) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance / spacing))
  return Array.from({ length: steps }, (_, index) => {
    const progress = (index + 1) / steps
    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
    }
  })
}

export function evaluateCut(
  points: Point[],
  surface: Rect,
  targetRatios: number[],
  completedTargets: number[],
): CutEvaluation | null {
  const inside = points.filter((point) => isPointInRect(point, expandRect(surface, 0.04)))
  if (inside.length < 2) return null

  const first = inside[0]
  const last = inside[inside.length - 1]
  const deltaX = last.x - first.x
  const deltaY = last.y - first.y
  if (Math.abs(deltaY) < surface.height * 0.5) return null

  const angleError = Math.atan2(Math.abs(deltaX), Math.abs(deltaY)) * (180 / Math.PI)
  if (angleError > 25) return null

  const averageX = inside.reduce((sum, point) => sum + point.x, 0) / inside.length
  const candidates = targetRatios
    .map((ratio, targetIndex) => ({
      targetIndex,
      positionError: Math.abs(averageX - (surface.x + surface.width * ratio)),
    }))
    .filter(({ targetIndex }) => !completedTargets.includes(targetIndex))
    .sort((a, b) => a.positionError - b.positionError)

  const match = candidates[0]
  const tolerance = surface.width * 0.18
  if (!match || match.positionError > tolerance) return null

  const accuracy = clamp(
    1 - (match.positionError / tolerance) * 0.55 - (angleError / 25) * 0.45,
  )
  return { ...match, accuracy, angleError, positionError: match.positionError }
}
