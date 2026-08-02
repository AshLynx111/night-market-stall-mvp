import type { CustomerLane, CustomerMood } from './types'

const PATHS = {
  left: { far: { x: 650, y: 260 }, near: { x: 390, y: 515 } },
  center: { far: { x: 720, y: 250 }, near: { x: 720, y: 525 } },
  right: { far: { x: 790, y: 260 }, near: { x: 1050, y: 515 } },
} as const

export interface CustomerPose {
  footX: number
  footY: number
  scale: number
  opacity: number
  shadowOpacity: number
}

export interface EmotionTransform {
  upperBodyOffsetY: number
  upperBodyRotation: number
  footOffsetY: 0
}

const EMOTION_TRANSFORMS: Record<CustomerMood, EmotionTransform> = {
  arriving: { upperBodyOffsetY: 0, upperBodyRotation: 0, footOffsetY: 0 },
  ordering: { upperBodyOffsetY: 0, upperBodyRotation: 0, footOffsetY: 0 },
  waiting: { upperBodyOffsetY: 0, upperBodyRotation: 0, footOffsetY: 0 },
  impatient: { upperBodyOffsetY: 0, upperBodyRotation: -2, footOffsetY: 0 },
  urgent: { upperBodyOffsetY: 0, upperBodyRotation: 2, footOffsetY: 0 },
  happy: { upperBodyOffsetY: -3, upperBodyRotation: 0, footOffsetY: 0 },
  disappointed: { upperBodyOffsetY: 2, upperBodyRotation: 0, footOffsetY: 0 },
}

function easePerspective(progress: number): number {
  const p = Math.max(0, Math.min(1, progress))
  return p * p * (3 - 2 * p)
}

function interpolate(far: number, near: number, progress: number): number {
  return far + (near - far) * progress
}

export function getCustomerPose(lane: CustomerLane, progress: number): CustomerPose {
  const path = PATHS[lane]
  const easedProgress = easePerspective(progress)

  return {
    footX: interpolate(path.far.x, path.near.x, easedProgress),
    footY: interpolate(path.far.y, path.near.y, easedProgress),
    scale: interpolate(0.34, 1, easedProgress),
    opacity: interpolate(0.45, 1, easedProgress),
    shadowOpacity: interpolate(0.08, 0.32, easedProgress),
  }
}

export function getEmotionTransform(mood: CustomerMood): EmotionTransform {
  return EMOTION_TRANSFORMS[mood]
}
