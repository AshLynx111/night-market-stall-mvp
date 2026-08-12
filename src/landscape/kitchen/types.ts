import type { IngredientId, OrderModifier, RecipeId } from '../campaign'

export type CustomerLane = 'left' | 'center' | 'right'
export type CustomerPresence = 'entering' | 'active' | 'leaving'
export type CustomerMood = 'arriving' | 'ordering' | 'waiting' | 'impatient' | 'urgent' | 'happy' | 'disappointed'
export type SlotId = 'left' | 'right'
export type HeatState = 'none' | 'raw' | 'ready' | 'scorched' | 'burnt'
export type SlotPhase = 'empty' | 'assembling' | 'cooking' | 'gesturing' | 'rolled' | 'on-tray'
export type TutorialMode = 'guided-first-order' | 'complete' | 'off'

export interface CustomerOrder {
  id: string
  customerId: string
  recipeId: RecipeId
  modifiers: OrderModifier[]
}

export interface CustomerState {
  id: string
  artId: string
  name: string
  lane: CustomerLane
  presence: CustomerPresence
  mood: CustomerMood
  pathProgress: number
  motionElapsedMs: number
  entryDelayMs: number
  patienceMs: number
  maxPatienceMs: number
  order: CustomerOrder
  transientMood?: {
    mood: 'disappointed'
    token: number
    expiresAtMs: number
  }
}

export interface GriddleSlotState {
  id: SlotId
  phase: SlotPhase
  orderId: string | null
  recipeId: RecipeId | null
  orderModifiers: OrderModifier[]
  completedStepIds: string[]
  heatState: HeatState
  heatElapsedMs: number
  heatReadyAtMs: number
  heatBurnAtMs: number
  sauceCoverage: number
  sauceStrokeCount?: number
  cutTargetIndices: number[]
  rollProgress: number
  qualityPenalty: number
}

export interface DeliveryRecord {
  orderId: string
  recipeId: RecipeId
  quality: number
}

export interface PendingCelebrityState {
  patienceOverrideMs?: number
}

export interface KitchenState {
  day: number
  seed: number
  patienceBonusMs: number
  elapsedMs: number
  paused: boolean
  tutorialMode: TutorialMode
  customers: CustomerState[]
  slots: [GriddleSlotState, GriddleSlotState]
  servedQualities: number[]
  deliveries: DeliveryRecord[]
  mistakes: number
  nextCustomerSequence: number
  nextTransientMoodToken: number
  pendingCelebrity: PendingCelebrityState | null
  celebrityOrderId: string | null
  celebrityServed: boolean
}
