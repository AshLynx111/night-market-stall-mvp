import type { CustomerLane, CustomerMood } from './types'

const PATHS = {
  left: { offscreenX: -170, settledX: 390, footY: 515 },
  center: { offscreenX: -170, settledX: 720, footY: 525 },
  right: { offscreenX: 1_610, settledX: 1_050, footY: 515 },
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

function easeHorizontalSlide(progress: number): number {
  const p = Math.max(0, Math.min(1, progress))
  return p * p * (3 - 2 * p)
}

function interpolate(far: number, near: number, progress: number): number {
  return far + (near - far) * progress
}

export function getCustomerPose(lane: CustomerLane, progress: number): CustomerPose {
  const path = PATHS[lane]
  const easedProgress = easeHorizontalSlide(progress)

  return {
    footX: interpolate(path.offscreenX, path.settledX, easedProgress),
    footY: path.footY,
    scale: 1,
    opacity: 1,
    shadowOpacity: 0.32,
  }
}

export function getEmotionTransform(mood: CustomerMood): EmotionTransform {
  return EMOTION_TRANSFORMS[mood]
}
