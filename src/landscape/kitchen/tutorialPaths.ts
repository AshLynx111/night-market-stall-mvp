import type { Point, Rect } from '../geometry'

export const TUTORIAL_GESTURE_RECT: Rect = { x: 0, y: 0, width: 1_000, height: 500 }
export type TutorialPathKind = 'sauce' | 'cut' | 'roll'

function saucePath(): Point[] {
  const points: Point[] = []
  for (let row = 0; row < 6; row += 1) {
    const columns = Array.from({ length: 10 }, (_, column) => column)
    if (row % 2 === 1) columns.reverse()
    for (const column of columns) {
      points.push({
        x: ((column + 0.5) / 10) * TUTORIAL_GESTURE_RECT.width,
        y: ((row + 0.5) / 6) * TUTORIAL_GESTURE_RECT.height,
      })
    }
  }
  return points
}

export function tutorialGesturePath(kind: TutorialPathKind, cutTargetIndex = 0): Point[] {
  if (kind === 'sauce') return saucePath()
  if (kind === 'cut') {
    const ratio = [0.3, 0.5, 0.7][cutTargetIndex] ?? 0.3
    return [
      { x: 150, y: TUTORIAL_GESTURE_RECT.height * ratio },
      { x: 850, y: TUTORIAL_GESTURE_RECT.height * ratio },
    ]
  }
  return [{ x: 100, y: 255 }, { x: 900, y: 245 }]
}

export function tutorialSvgPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function nextCutTargetIndex(completed: readonly number[]): number {
  return [0, 1, 2].find((target) => !completed.includes(target)) ?? 2
}
