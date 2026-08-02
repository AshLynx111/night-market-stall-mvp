import { effectiveRecipeSteps } from '../campaign'
import type { IngredientId } from '../campaign'
import type { GriddleSlotState, KitchenState, SlotId } from './types'

export type TutorialStep =
  | 'customer-arrival'
  | 'noodle'
  | 'egg'
  | 'wait-egg'
  | 'hot-dog'
  | 'wait-hot-dog'
  | 'sauce'
  | 'scallion'
  | 'cut'
  | 'roll'
  | 'pack'
  | 'serve'
  | 'done'

const INSTRUCTIONS: Record<TutorialStep, string> = {
  'customer-arrival': '第一位顾客正在走来，等她站稳后看看订单。',
  noodle: '先从一张面皮开始。',
  egg: '点击或拖动鸡蛋到左边铁板。',
  'wait-egg': '鸡蛋正在煎，变成金黄色再加热狗。',
  'hot-dog': '煎好啦，拖入热狗。',
  'wait-hot-dog': '热狗正在煎，火候正好后再刷酱。',
  sauce: '拿起酱刷，沿提示来回刷满酱汁。',
  scallion: '撒上葱花。',
  cut: '沿三条提示横线各切一刀。',
  roll: '从左向右滑动，把烤冷面卷起来。',
  pack: '点击卷好的烤冷面装盘。',
  serve: '把托盘里的烤冷面递给左边顾客。',
  done: '第一份完成！现在可以同时服务顾客了。',
}

const INGREDIENT_FOR_STEP: Partial<Record<TutorialStep, IngredientId>> = {
  noodle: 'noodle',
  egg: 'egg',
  'hot-dog': 'hot-dog',
  scallion: 'scallion',
}

export function tutorialStep(state: KitchenState): TutorialStep {
  if (state.tutorialMode !== 'guided-first-order') return 'done'
  if (state.customers[0]?.presence !== 'active') return 'customer-arrival'
  const slot = state.slots[0]
  if (slot.phase === 'empty') return 'noodle'
  if (slot.phase === 'on-tray') return 'serve'
  if (slot.phase === 'rolled') return 'pack'
  if (slot.phase === 'cooking' && slot.heatState === 'raw') {
    return slot.completedStepIds.at(-1) === 'egg' ? 'wait-egg' : 'wait-hot-dog'
  }
  const steps = effectiveRecipeSteps('classic', slot.orderModifiers)
  return (steps[slot.completedStepIds.length]?.id ?? 'done') as TutorialStep
}

export function tutorialInstruction(state: KitchenState): string {
  return INSTRUCTIONS[tutorialStep(state)]
}

export function tutorialAllowsIngredient(
  state: KitchenState,
  ingredient: IngredientId,
  slotId: SlotId,
): boolean {
  if (state.tutorialMode !== 'guided-first-order') return true
  return slotId === 'left' && INGREDIENT_FOR_STEP[tutorialStep(state)] === ingredient
}

export function isTutorialHeatProtected(state: KitchenState, slot: GriddleSlotState): boolean {
  return state.tutorialMode === 'guided-first-order' && slot.id === 'left' && slot.phase === 'cooking'
}
