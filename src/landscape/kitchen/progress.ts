import type { DayConfig } from '../campaign'
import type { KitchenState } from './types'

export function isKitchenDayComplete(day: DayConfig, state: KitchenState): boolean {
  if (state.servedQualities.length < day.targetOrders) return false
  return day.day !== 5 || state.celebrityServed
}
