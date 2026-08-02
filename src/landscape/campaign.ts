import classicDish from '../assets/approved/menu/dishes/dish-classic-noodle.png'
import bigEaterDish from '../assets/approved/menu/dishes/dish-big-eater-noodle.png'
import orleansDish from '../assets/approved/menu/dishes/dish-orleans-chicken-noodle.png'
import signatureDish from '../assets/approved/menu/dishes/dish-signature-cheese-turkey-noodle.png'
import tenderloinDish from '../assets/approved/menu/dishes/dish-tenderloin-turkey-noodle.png'
import noodleSheet from '../assets/approved/menu/ingredients/ingredient-noodle-sheet.png'
import egg from '../assets/approved/menu/ingredients/ingredient-egg.png'
import hotDog from '../assets/approved/menu/ingredients/ingredient-hot-dog.png'
import cheese from '../assets/approved/menu/ingredients/ingredient-cheese.png'
import turkeyNoodle from '../assets/approved/menu/ingredients/ingredient-turkey-noodle.png'
import corn from '../assets/approved/menu/ingredients/ingredient-corn.png'
import orleansChicken from '../assets/approved/menu/ingredients/ingredient-orleans-chicken.png'
import tenderloin from '../assets/approved/menu/ingredients/ingredient-tenderloin.png'
import sauce from '../assets/approved/menu/ingredients/ingredient-sauce.png'
import scallion from '../assets/approved/menu/ingredients/ingredient-scallion.png'
import cilantro from '../assets/approved/menu/ingredients/ingredient-cilantro.png'
import onion from '../assets/approved/menu/ingredients/ingredient-onion.png'
import chiliPowder from '../assets/approved/menu/ingredients/ingredient-chili-powder.png'
import bacon from '../assets/approved/menu/ingredients/ingredient-bacon.png'
import enoki from '../assets/approved/menu/ingredients/ingredient-enoki.png'

export type RecipeId = 'classic' | 'big-eater' | 'orleans' | 'tenderloin' | 'signature'
export type IngredientId =
  | 'noodle'
  | 'egg'
  | 'hot-dog'
  | 'sauce'
  | 'scallion'
  | 'cilantro'
  | 'onion'
  | 'chili-powder'
  | 'turkey-noodle'
  | 'cheese'
  | 'corn'
  | 'orleans'
  | 'bacon'
  | 'tenderloin'
  | 'enoki'

export type OrderModifier =
  | { kind: 'extra'; ingredient: IngredientId }
  | { kind: 'without'; ingredient: IngredientId }
  | { kind: 'heat'; level: 'mild' | 'normal' | 'hot' }

export const INGREDIENT_UNLOCK_DAY: Record<IngredientId, number> = {
  noodle: 1,
  egg: 1,
  'hot-dog': 1,
  sauce: 1,
  scallion: 1,
  cilantro: 2,
  onion: 2,
  'chili-powder': 2,
  'turkey-noodle': 3,
  cheese: 3,
  corn: 3,
  orleans: 4,
  bacon: 4,
  tenderloin: 5,
  enoki: 5,
}

export function availableIngredients(day: number): IngredientId[] {
  return (Object.entries(INGREDIENT_UNLOCK_DAY) as [IngredientId, number][])
    .filter(([, unlockDay]) => unlockDay <= day)
    .map(([ingredient]) => ingredient)
}

export type StepId =
  | IngredientId
  | 'second-noodle'
  | 'second-egg'
  | 'cut'
  | 'roll'
  | 'pack'

export interface CookingStep {
  id: StepId
  label: string
  verb: string
  icon: string
  asset?: string
  repeat?: number
}

export interface Recipe {
  id: RecipeId
  name: string
  shortName: string
  price: number
  image: string
  accent: string
  steps: CookingStep[]
}

const INGREDIENT_STEP_DETAILS: Record<IngredientId, Pick<CookingStep, 'label' | 'verb' | 'icon' | 'asset'>> = {
  noodle: { label: '面皮', verb: '铺上面皮', icon: '▱', asset: noodleSheet },
  egg: { label: '鸡蛋', verb: '打入鸡蛋', icon: '●', asset: egg },
  'hot-dog': { label: '热狗', verb: '加入热狗', icon: '●', asset: hotDog },
  sauce: { label: '刷酱', verb: '均匀刷酱', icon: '▥', asset: sauce },
  scallion: { label: '葱花', verb: '撒上葱花', icon: '╱', asset: scallion },
  cilantro: { label: '香菜', verb: '加一份香菜', icon: '+', asset: cilantro },
  onion: { label: '洋葱', verb: '加一份洋葱', icon: '+', asset: onion },
  'chili-powder': { label: '辣椒粉', verb: '撒上辣椒粉', icon: '♨', asset: chiliPowder },
  'turkey-noodle': { label: '火鸡面', verb: '加入火鸡面', icon: '≋', asset: turkeyNoodle },
  cheese: { label: '芝士', verb: '铺上芝士', icon: '◇', asset: cheese },
  corn: { label: '玉米粒', verb: '撒上玉米粒', icon: '●', asset: corn },
  orleans: { label: '鸡排', verb: '加入奥尔良鸡排', icon: '▰', asset: orleansChicken },
  bacon: { label: '培根', verb: '加一份培根', icon: '+', asset: bacon },
  tenderloin: { label: '里脊肉', verb: '铺上里脊肉', icon: '▰', asset: tenderloin },
  enoki: { label: '金针菇', verb: '加一份金针菇', icon: '+', asset: enoki },
}

const BASE: CookingStep[] = [
  { id: 'noodle', label: '面皮', verb: '铺上面皮', icon: '▱', asset: noodleSheet },
  { id: 'egg', label: '鸡蛋', verb: '打入鸡蛋', icon: '●', asset: egg },
]

const FINISH: CookingStep[] = [
  { id: 'sauce', label: '刷酱', verb: '均匀刷酱', icon: '▥', asset: sauce, repeat: 3 },
  { id: 'scallion', label: '葱花', verb: '撒上葱花', icon: '╱', asset: scallion },
  { id: 'cut', label: '切段', verb: '沿虚线切三刀', icon: '╱', repeat: 3 },
  { id: 'roll', label: '卷起', verb: '把烤冷面卷起来', icon: '◫' },
  { id: 'pack', label: '装袋', verb: '装好递给顾客', icon: '▰' },
]

export const RECIPES: Record<RecipeId, Recipe> = {
  classic: {
    id: 'classic',
    name: '经典款烤冷面',
    shortName: '经典款',
    price: 7,
    image: classicDish,
    accent: '#e79b31',
    steps: [...BASE, { id: 'hot-dog', label: '热狗', verb: '加入热狗', icon: '●', asset: hotDog }, ...FINISH],
  },
  'big-eater': {
    id: 'big-eater',
    name: '大胃王烤冷面',
    shortName: '大胃王',
    price: 10,
    image: bigEaterDish,
    accent: '#e56e45',
    steps: [
      ...BASE,
      { id: 'second-noodle', label: '第2张面皮', verb: '再铺一张面皮', icon: '▱', asset: noodleSheet },
      { id: 'second-egg', label: '第2颗鸡蛋', verb: '再打一颗鸡蛋', icon: '●', asset: egg },
      ...FINISH,
    ],
  },
  orleans: {
    id: 'orleans',
    name: '奥尔良鸡排烤冷面',
    shortName: '奥尔良鸡排',
    price: 10,
    image: orleansDish,
    accent: '#da5a36',
    steps: [...BASE, { id: 'orleans', label: '鸡排', verb: '加入奥尔良鸡排', icon: '▰', asset: orleansChicken }, ...FINISH],
  },
  tenderloin: {
    id: 'tenderloin',
    name: '里脊肉火鸡烤冷面',
    shortName: '里脊火鸡',
    price: 14,
    image: tenderloinDish,
    accent: '#c9492e',
    steps: [
      ...BASE,
      { id: 'turkey-noodle', label: '火鸡面', verb: '加入火鸡面', icon: '≋', asset: turkeyNoodle },
      { id: 'tenderloin', label: '里脊肉', verb: '铺上里脊肉', icon: '▰', asset: tenderloin },
      ...FINISH,
    ],
  },
  signature: {
    id: 'signature',
    name: '招牌芝士火鸡烤冷面',
    shortName: '招牌芝士火鸡',
    price: 16,
    image: signatureDish,
    accent: '#c23c26',
    steps: [
      ...BASE,
      { id: 'turkey-noodle', label: '火鸡面', verb: '加入火鸡面', icon: '≋', asset: turkeyNoodle },
      { id: 'cheese', label: '芝士', verb: '铺上芝士', icon: '◇', asset: cheese },
      { id: 'corn', label: '玉米粒', verb: '撒上玉米粒', icon: '●', asset: corn },
      ...FINISH,
    ],
  },
}

export interface DayConfig {
  day: number
  title: string
  story: string
  targetOrders: number
  patienceSeconds: number
  recipes: RecipeId[]
  goal: string
}

export const DAYS: DayConfig[] = [
  { day: 1, title: '开张第一天', story: '大学城夜市开张，先把经典款做扎实。', targetOrders: 3, patienceSeconds: 90, recipes: ['classic'], goal: '完成教学并出餐 3 份' },
  { day: 2, title: '饭量挑战', story: '社团活动散场，大胃王订单变多了。', targetOrders: 4, patienceSeconds: 80, recipes: ['classic', 'big-eater'], goal: '处理双面双蛋订单' },
  { day: 3, title: '香味出圈', story: '奥尔良鸡排的香味把路人都吸引过来。', targetOrders: 5, patienceSeconds: 72, recipes: ['classic', 'big-eater', 'signature'], goal: '平均满意度达到 75%' },
  { day: 4, title: '夜市高峰', story: '摊位开始排队，奥尔良鸡排和培根组合正式登场。', targetOrders: 6, patienceSeconds: 66, recipes: ['classic', 'big-eater', 'signature', 'orleans'], goal: '在高峰期完成奥尔良鸡排订单' },
  { day: 5, title: '惊喜来客', story: '里脊肉和金针菇刚上新，旅途中的男明星也慕名而来。', targetOrders: 7, patienceSeconds: 66, recipes: ['classic', 'big-eater', 'orleans', 'tenderloin', 'signature'], goal: '完成明星的招牌订单，并应对里脊金针菇加料' },
  { day: 6, title: '明星同款', story: '旅行分享带来热度，大家都想尝尝明星同款。', targetOrders: 8, patienceSeconds: 60, recipes: ['classic', 'big-eater', 'orleans', 'tenderloin', 'signature'], goal: '接住爆发客流' },
]

export const CUSTOMER_NAMES = ['小林同学', '阿杰', '晓雨', '社团学长', '苏晴', '大壮', '许研', '阿哲', '陈老师', '王奶奶']

export function recipeForOrder(day: DayConfig, orderIndex: number, celebrityOrder = false) {
  if (celebrityOrder) return RECIPES.signature
  if (day.day === 6 && orderIndex < 3) return RECIPES.signature
  return RECIPES[day.recipes[orderIndex % day.recipes.length]]
}

const EXTRA = (ingredient: IngredientId): OrderModifier => ({ kind: 'extra', ingredient })

const DAY_MODIFIER_CYCLES: Partial<Record<number, readonly (readonly OrderModifier[])[]>> = {
  2: [[EXTRA('cilantro')], [EXTRA('onion')], [EXTRA('chili-powder')]],
  3: [[EXTRA('cilantro')], [EXTRA('onion')], [EXTRA('chili-powder')]],
  4: [[EXTRA('bacon')], [EXTRA('cilantro')], [EXTRA('onion')], [EXTRA('chili-powder')]],
  5: [[EXTRA('enoki')], [EXTRA('bacon')], [EXTRA('cilantro')], [EXTRA('onion')], [EXTRA('chili-powder')]],
  6: [
    [{ kind: 'heat', level: 'hot' }],
    [EXTRA('enoki'), { kind: 'without', ingredient: 'scallion' }, { kind: 'heat', level: 'mild' }],
    [EXTRA('bacon'), { kind: 'heat', level: 'normal' }],
    [EXTRA('cilantro')],
    [EXTRA('onion')],
    [{ kind: 'without', ingredient: 'scallion' }, { kind: 'heat', level: 'hot' }],
  ],
}

export function modifiersForOrder(day: DayConfig, orderIndex: number, celebrityOrder = false): OrderModifier[] {
  if (celebrityOrder) return [EXTRA('egg'), { kind: 'heat', level: 'mild' }]
  const cycle = DAY_MODIFIER_CYCLES[day.day]
  if (!cycle?.length) return []
  return cycle[Math.abs(orderIndex) % cycle.length].map((modifier) => ({ ...modifier }))
}

export function ingredientForCookingStep(step: CookingStep | StepId): IngredientId | null {
  const stepId = typeof step === 'string' ? step : step.id
  if (stepId === 'second-noodle') return 'noodle'
  if (stepId === 'second-egg') return 'egg'
  if (stepId === 'cut' || stepId === 'roll' || stepId === 'pack') return null
  return stepId
}

function extraStep(ingredient: IngredientId): CookingStep {
  const details = INGREDIENT_STEP_DETAILS[ingredient]
  return { id: ingredient, ...details, label: `加量${details.label}`, verb: `加入加量${details.label}` }
}

export function effectiveRecipeSteps(recipeId: RecipeId, modifiers: readonly OrderModifier[]): CookingStep[] {
  const without = new Set(
    modifiers.flatMap((modifier) => modifier.kind === 'without' ? [modifier.ingredient] : []),
  )
  const heat = modifiers.find((modifier) => modifier.kind === 'heat')
  if (heat?.kind === 'heat' && heat.level === 'mild') without.add('chili-powder')

  const base = RECIPES[recipeId].steps.filter((step) => {
    const ingredient = ingredientForCookingStep(step)
    return ingredient === null || !without.has(ingredient)
  })
  const additions = modifiers
    .flatMap((modifier) => modifier.kind === 'extra' && !without.has(modifier.ingredient) ? [extraStep(modifier.ingredient)] : [])
  if (heat?.kind === 'heat' && heat.level === 'hot'
    && !without.has('chili-powder')
    && !additions.some((step) => step.id === 'chili-powder')) {
    additions.push(extraStep('chili-powder'))
  }

  const steps = [...base]
  const deferred: CookingStep[] = []
  for (const addition of additions) {
    let canonicalIndex = -1
    for (let index = 0; index < steps.length; index += 1) {
      if (steps[index].id === addition.id) canonicalIndex = index
    }
    if (canonicalIndex >= 0) steps.splice(canonicalIndex + 1, 0, addition)
    else deferred.push(addition)
  }

  const sauceIndex = steps.findIndex((step) => step.id === 'sauce')
  if (sauceIndex < 0) return [...steps, ...deferred]
  return [...steps.slice(0, sauceIndex), ...deferred, ...steps.slice(sauceIndex)]
}

export function starsForDay(qualities: number[], mistakes: number) {
  if (!qualities.length) return 0
  const average = qualities.reduce((sum, value) => sum + value, 0) / qualities.length
  if (average >= 90 && mistakes === 0) return 3
  if (average >= 75) return 2
  return 1
}

export function incomeForDelivery(recipeId: RecipeId, quality: number, signLevel: number) {
  const bonusRate = quality >= 92 ? 1.4 : quality >= 78 ? 1.15 : 1
  return Math.round(RECIPES[recipeId].price * bonusRate) + signLevel * 2
}
