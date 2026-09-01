import type { IngredientId, RecipeId } from '../landscape/campaign'
import type { SlotId } from '../landscape/kitchen/types'
import type { TutorialStep } from '../landscape/kitchen/tutorial'
import type { Locale } from '../i18n/core'

export type AnalyticsScreen = 'home' | 'settings' | 'select' | 'playing' | 'event' | 'summary'
export type CoarsePlatform = 'mobile' | 'tablet' | 'desktop'
export type MistakeType = 'ingredient' | 'gesture' | 'serve' | 'burnt' | 'discard' | 'unknown'

export interface GameEventProperties {
  game_loaded: { screen: AnalyticsScreen }
  session_started: { screen: AnalyticsScreen }
  session_ended: CheckpointProperties & { reason: 'pagehide' }
  session_checkpoint: CheckpointProperties & { reason: 'hidden' | 'pagehide' }
  home_viewed: Record<string, never>
  start_game_clicked: { day: 1 }
  continue_clicked: { day: number }
  day_select_opened: { source: 'home' | 'summary' }
  settings_opened: { source: 'home' }
  day_started: { day: number; guided_tutorial: boolean }
  tutorial_started: { day: 1 }
  tutorial_step_viewed: TutorialTimingProperties
  tutorial_step_completed: TutorialTimingProperties
  tutorial_completed: { elapsed_since_tutorial_start_ms: number }
  first_order_started: { day: number; recipe_id: RecipeId }
  first_order_completed: { day: number; recipe_id: RecipeId; duration_ms: number; mistakes: number; quality: number }
  ingredient_selected: { ingredient_id: IngredientId; slot_id?: SlotId }
  ingredient_placed: { ingredient_id: IngredientId; recipe_id: RecipeId; step_id: string; slot_id: SlotId }
  gesture_completed: { gesture_id: 'sauce' | 'cut' | 'roll'; recipe_id: RecipeId; step_id: string; slot_id: SlotId }
  dish_packed: { recipe_id: RecipeId; slot_id: SlotId }
  serve_attempted: { recipe_id: RecipeId; slot_id: SlotId; customer_id: string }
  serve_succeeded: { recipe_id: RecipeId; slot_id: SlotId; customer_id: string; quality: number }
  serve_failed: { recipe_id?: RecipeId; slot_id: SlotId; customer_id: string; reason: 'wrong_customer' | 'not_ready' | 'unknown' }
  griddle_discarded: { recipe_id?: RecipeId; slot_id: SlotId }
  help_opened: { screen: AnalyticsScreen; day?: number }
  pause_opened: { day: number }
  order_timeout: { day: number; recipe_id: RecipeId; customer_id: string }
  mistake_recorded: { day: number; mistake_type: MistakeType; step_id?: string; slot_id?: SlotId }
  repeated_mistake: { day: number; mistake_type: MistakeType; count: 3 }
  day_completed: { day: number; session_elapsed_ms: number; day_elapsed_ms: number; orders_served: number; average_quality: number; mistakes: number; stars: number; cash: number }
  summary_viewed: { day: number; orders_served: number; average_quality: number; mistakes: number; stars: number; cash: number }
  play_again_clicked: { day: number }
  next_day_clicked: { from_day: number; next_day: number }
  back_to_day_select_clicked: { from_day: number }
  feedback_clicked: { day: number }
}

interface CheckpointProperties {
  screen: AnalyticsScreen
  day?: number
  tutorial_step?: TutorialStep
  orders_served: number
  elapsed_ms: number
}

interface TutorialTimingProperties {
  step: TutorialStep
  elapsed_since_tutorial_start_ms: number
}

export type GameEventName = keyof GameEventProperties

export interface TrackedGameEvent<Name extends GameEventName = GameEventName> {
  event_id: string
  name: Name
  timestamp: string
  t: number
  session_id: string
  day_run_id?: string
  participant_id?: string
  locale: Locale
  viewport_width: number
  viewport_height: number
  touch: boolean
  platform: CoarsePlatform
  playtest_mode: boolean
  build_version: string
  properties: GameEventProperties[Name]
}

export interface TrackOptions {
  onceKey?: string
  lifecycle?: boolean
}

const EVENT_NAMES = new Set<GameEventName>([
  'game_loaded', 'session_started', 'session_ended', 'session_checkpoint',
  'home_viewed', 'start_game_clicked', 'continue_clicked', 'day_select_opened', 'settings_opened',
  'day_started', 'tutorial_started', 'tutorial_step_viewed', 'tutorial_step_completed', 'tutorial_completed',
  'first_order_started', 'first_order_completed', 'ingredient_selected', 'ingredient_placed',
  'gesture_completed', 'dish_packed', 'serve_attempted', 'serve_succeeded', 'serve_failed',
  'griddle_discarded', 'help_opened', 'pause_opened', 'order_timeout', 'mistake_recorded',
  'repeated_mistake', 'day_completed', 'summary_viewed', 'play_again_clicked', 'next_day_clicked',
  'back_to_day_select_clicked', 'feedback_clicked',
])

const SCREENS = new Set<AnalyticsScreen>(['home', 'settings', 'select', 'playing', 'event', 'summary'])
const TUTORIAL_STEPS = new Set<TutorialStep>([
  'customer-arrival', 'noodle', 'egg', 'wait-egg', 'hot-dog', 'wait-hot-dog',
  'sauce', 'scallion', 'cut', 'roll', 'pack', 'serve', 'done',
])
const INGREDIENT_IDS = new Set<IngredientId>([
  'noodle', 'egg', 'hot-dog', 'sauce', 'scallion', 'cilantro', 'onion', 'chili-powder',
  'turkey-noodle', 'cheese', 'corn', 'orleans', 'bacon', 'tenderloin', 'enoki',
])
const RECIPE_IDS = new Set<RecipeId>(['classic', 'big-eater', 'orleans', 'tenderloin', 'signature'])
const SLOTS = new Set<SlotId>(['left', 'right'])
const MISTAKES = new Set<MistakeType>(['ingredient', 'gesture', 'serve', 'burnt', 'discard', 'unknown'])

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function integer(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function safeId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)
}

function keysOnly(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function checkpoint(value: Record<string, unknown>, reason: 'hidden' | 'pagehide') {
  return keysOnly(value, ['screen', 'day', 'tutorial_step', 'orders_served', 'elapsed_ms', 'reason'])
    && SCREENS.has(value.screen as AnalyticsScreen)
    && (value.day === undefined || integer(value.day))
    && (value.tutorial_step === undefined || TUTORIAL_STEPS.has(value.tutorial_step as TutorialStep))
    && integer(value.orders_served)
    && finite(value.elapsed_ms)
    && value.reason === reason
}

export function isGameEventName(value: unknown): value is GameEventName {
  return typeof value === 'string' && EVENT_NAMES.has(value as GameEventName)
}

export function isValidGameEvent<Name extends GameEventName>(name: Name, properties: unknown): properties is GameEventProperties[Name] {
  const value = record(properties)
  if (!value) return false
  const day = () => integer(value.day) && Number(value.day) >= 1 && Number(value.day) <= 6
  const slot = () => SLOTS.has(value.slot_id as SlotId)
  const recipe = (optional = false) => optional && value.recipe_id === undefined || RECIPE_IDS.has(value.recipe_id as RecipeId)
  const customer = () => safeId(value.customer_id)
  const elapsed = (key: string) => finite(value[key]) && Number(value[key]) >= 0

  switch (name) {
    case 'game_loaded':
    case 'session_started': return keysOnly(value, ['screen']) && SCREENS.has(value.screen as AnalyticsScreen)
    case 'session_ended': return checkpoint(value, 'pagehide')
    case 'session_checkpoint': return (value.reason === 'hidden' || value.reason === 'pagehide') && checkpoint(value, value.reason)
    case 'home_viewed': return Object.keys(value).length === 0
    case 'start_game_clicked': return keysOnly(value, ['day']) && value.day === 1
    case 'continue_clicked':
    case 'day_started': return keysOnly(value, name === 'day_started' ? ['day', 'guided_tutorial'] : ['day']) && day() && (name !== 'day_started' || typeof value.guided_tutorial === 'boolean')
    case 'day_select_opened': return keysOnly(value, ['source']) && (value.source === 'home' || value.source === 'summary')
    case 'settings_opened': return keysOnly(value, ['source']) && value.source === 'home'
    case 'tutorial_started': return keysOnly(value, ['day']) && value.day === 1
    case 'tutorial_step_viewed':
    case 'tutorial_step_completed': return keysOnly(value, ['step', 'elapsed_since_tutorial_start_ms']) && TUTORIAL_STEPS.has(value.step as TutorialStep) && elapsed('elapsed_since_tutorial_start_ms')
    case 'tutorial_completed': return keysOnly(value, ['elapsed_since_tutorial_start_ms']) && elapsed('elapsed_since_tutorial_start_ms')
    case 'first_order_started': return keysOnly(value, ['day', 'recipe_id']) && day() && recipe()
    case 'first_order_completed': return keysOnly(value, ['day', 'recipe_id', 'duration_ms', 'mistakes', 'quality']) && day() && recipe() && elapsed('duration_ms') && integer(value.mistakes) && finite(value.quality)
    case 'ingredient_selected': return keysOnly(value, ['ingredient_id', 'slot_id']) && INGREDIENT_IDS.has(value.ingredient_id as IngredientId) && (value.slot_id === undefined || slot())
    case 'ingredient_placed': return keysOnly(value, ['ingredient_id', 'recipe_id', 'step_id', 'slot_id']) && INGREDIENT_IDS.has(value.ingredient_id as IngredientId) && recipe() && safeId(value.step_id) && slot()
    case 'gesture_completed': return keysOnly(value, ['gesture_id', 'recipe_id', 'step_id', 'slot_id']) && (value.gesture_id === 'sauce' || value.gesture_id === 'cut' || value.gesture_id === 'roll') && recipe() && safeId(value.step_id) && slot()
    case 'dish_packed': return keysOnly(value, ['recipe_id', 'slot_id']) && recipe() && slot()
    case 'serve_attempted': return keysOnly(value, ['recipe_id', 'slot_id', 'customer_id']) && recipe() && slot() && customer()
    case 'serve_succeeded': return keysOnly(value, ['recipe_id', 'slot_id', 'customer_id', 'quality']) && recipe() && slot() && customer() && finite(value.quality)
    case 'serve_failed': return keysOnly(value, ['recipe_id', 'slot_id', 'customer_id', 'reason']) && recipe(true) && slot() && customer() && (value.reason === 'wrong_customer' || value.reason === 'not_ready' || value.reason === 'unknown')
    case 'griddle_discarded': return keysOnly(value, ['recipe_id', 'slot_id']) && recipe(true) && slot()
    case 'help_opened': return keysOnly(value, ['screen', 'day']) && SCREENS.has(value.screen as AnalyticsScreen) && (value.day === undefined || day())
    case 'pause_opened': return keysOnly(value, ['day']) && day()
    case 'order_timeout': return keysOnly(value, ['day', 'recipe_id', 'customer_id']) && day() && recipe() && customer()
    case 'mistake_recorded': return keysOnly(value, ['day', 'mistake_type', 'step_id', 'slot_id']) && day() && MISTAKES.has(value.mistake_type as MistakeType) && (value.step_id === undefined || safeId(value.step_id)) && (value.slot_id === undefined || slot())
    case 'repeated_mistake': return keysOnly(value, ['day', 'mistake_type', 'count']) && day() && MISTAKES.has(value.mistake_type as MistakeType) && value.count === 3
    case 'day_completed': return keysOnly(value, ['day', 'session_elapsed_ms', 'day_elapsed_ms', 'orders_served', 'average_quality', 'mistakes', 'stars', 'cash']) && day() && elapsed('session_elapsed_ms') && elapsed('day_elapsed_ms') && integer(value.orders_served) && finite(value.average_quality) && integer(value.mistakes) && integer(value.stars) && finite(value.cash)
    case 'summary_viewed': return keysOnly(value, ['day', 'orders_served', 'average_quality', 'mistakes', 'stars', 'cash']) && day() && integer(value.orders_served) && finite(value.average_quality) && integer(value.mistakes) && integer(value.stars) && finite(value.cash)
    case 'play_again_clicked':
    case 'back_to_day_select_clicked': return keysOnly(value, [name === 'play_again_clicked' ? 'day' : 'from_day']) && integer(value[name === 'play_again_clicked' ? 'day' : 'from_day'])
    case 'next_day_clicked': return keysOnly(value, ['from_day', 'next_day']) && integer(value.from_day) && integer(value.next_day)
    case 'feedback_clicked': return keysOnly(value, ['day']) && day()
  }
}
