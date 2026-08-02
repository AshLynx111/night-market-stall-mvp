export interface CampaignSave {
  coins: number
  fireLevel: number
  signLevel: number
  bestStars: Record<number, number>
  maxUnlockedDay: number
}

export const DEFAULT_CAMPAIGN_SAVE: CampaignSave = {
  coins: 36, fireLevel: 0, signLevel: 0, bestStars: {}, maxUnlockedDay: 1,
}

function contiguousUnlockedDay(bestStars: Record<number, number>) {
  let completed = 0
  while (completed < 6 && (bestStars[completed + 1] ?? 0) > 0) completed += 1
  return Math.min(6, completed + 1)
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function sanitizeBestStars(value: unknown): Record<number, number> {
  if (!isRecord(value)) return {}

  const bestStars: Record<number, number> = {}
  for (let day = 1; day <= 6; day += 1) {
    const stars = value[day]
    if (typeof stars === 'number'
      && Number.isFinite(stars)
      && Number.isInteger(stars)
      && stars >= 0
      && stars <= 3) {
      bestStars[day] = stars
    }
  }
  return bestStars
}

export function normalizeCampaignSave(value: unknown): CampaignSave {
  const input = isRecord(value) ? value as Partial<CampaignSave> : {}
  const bestStars = sanitizeBestStars(input.bestStars)
  return {
    coins: Number.isFinite(input.coins) ? Math.max(0, Number(input.coins)) : 36,
    fireLevel: input.fireLevel === 1 || input.fireLevel === 2 ? input.fireLevel : 0,
    signLevel: input.signLevel === 1 || input.signLevel === 2 ? input.signLevel : 0,
    bestStars,
    maxUnlockedDay: contiguousUnlockedDay(bestStars),
  }
}

export function completeCampaignDay(save: CampaignSave, day: number, stars: number): CampaignSave {
  const bestStars = { ...save.bestStars, [day]: Math.max(save.bestStars[day] ?? 0, stars) }
  return { ...save, bestStars, maxUnlockedDay: contiguousUnlockedDay(bestStars) }
}

export const highestPlayableDay = (save: CampaignSave) => Math.min(6, Math.max(1, save.maxUnlockedDay))
