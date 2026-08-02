import type { CustomerState } from './types'

export const CUSTOMER_MOTION_TIMING = {
  walkInMs: 1_500,
  settleMs: 200,
  initialStaggerMs: 450,
  turnOutMs: 200,
  walkOutMs: 1_100,
  walkCycleMs: 640,
  frameCount: 8,
} as const

export type CustomerJourneyPhase =
  | 'entry-delay'
  | 'walking-in'
  | 'settling'
  | 'active'
  | 'turning-out'
  | 'walking-out'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export function customerJourneyPhase(customer: CustomerState): CustomerJourneyPhase {
  if (customer.presence === 'active') return 'active'
  if (customer.presence === 'leaving') {
    return customer.motionElapsedMs < CUSTOMER_MOTION_TIMING.turnOutMs ? 'turning-out' : 'walking-out'
  }
  const localMs = customer.motionElapsedMs - customer.entryDelayMs
  if (localMs < 0) return 'entry-delay'
  if (localMs < CUSTOMER_MOTION_TIMING.walkInMs) return 'walking-in'
  return 'settling'
}

export function customerMotionFrame(customer: CustomerState): number {
  if (customer.presence === 'leaving' && customer.motionElapsedMs < CUSTOMER_MOTION_TIMING.turnOutMs) {
    return Math.min(
      CUSTOMER_MOTION_TIMING.frameCount - 1,
      Math.floor(customer.motionElapsedMs / CUSTOMER_MOTION_TIMING.turnOutMs * CUSTOMER_MOTION_TIMING.frameCount),
    )
  }
  const localMs = customer.presence === 'entering'
    ? Math.max(0, customer.motionElapsedMs - customer.entryDelayMs)
    : Math.max(0, customer.motionElapsedMs - CUSTOMER_MOTION_TIMING.turnOutMs)
  const frameMs = CUSTOMER_MOTION_TIMING.walkCycleMs / CUSTOMER_MOTION_TIMING.frameCount
  return Math.floor(localMs / frameMs) % CUSTOMER_MOTION_TIMING.frameCount
}

export function advanceCustomerJourney(customer: CustomerState, deltaMs: number): CustomerState {
  const elapsed = Math.max(0, deltaMs)
  if (elapsed === 0 || customer.presence === 'active') return customer
  const motionElapsedMs = customer.motionElapsedMs + elapsed

  if (customer.presence === 'entering') {
    const localMs = motionElapsedMs - customer.entryDelayMs
    const pathProgress = clamp01(localMs / CUSTOMER_MOTION_TIMING.walkInMs)
    const settled = localMs >= CUSTOMER_MOTION_TIMING.walkInMs + CUSTOMER_MOTION_TIMING.settleMs
    return {
      ...customer,
      motionElapsedMs,
      pathProgress,
      presence: settled ? 'active' : 'entering',
      mood: settled ? 'waiting' : pathProgress === 1 ? 'ordering' : 'arriving',
    }
  }

  const walkElapsedMs = Math.max(0, motionElapsedMs - CUSTOMER_MOTION_TIMING.turnOutMs)
  return {
    ...customer,
    motionElapsedMs,
    pathProgress: 1 - clamp01(walkElapsedMs / CUSTOMER_MOTION_TIMING.walkOutMs),
  }
}
