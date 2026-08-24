import { describe, expect, it } from 'vitest'
import { nextRetentionCue, retentionCueForDay } from './dayRetention'

describe('day retention cues', () => {
  it('derives Day 1 from the empty pre-campaign state', () => {
    const cue = retentionCueForDay(1)

    expect(cue.newIngredients).toEqual(['noodle', 'egg', 'hot-dog', 'sauce', 'scallion'])
    expect(cue.newRecipes).toEqual(['classic'])
    expect(cue.shortHook).toBe('经典款解锁')
    expect(cue.accessibleDescription).toContain('完成教学并出餐 3 份')
  })

  it('derives Day 2 ingredients and recipe directly from campaign configuration', () => {
    const cue = retentionCueForDay(2)

    expect(cue.newIngredients).toEqual(['cilantro', 'onion', 'chili-powder'])
    expect(cue.newRecipes).toEqual(['big-eater'])
    expect(cue.shortHook).toBe('大胃王解锁')
    expect(cue.accessibleDescription).toContain('新食材：香菜、洋葱、辣椒粉')
  })

  it('uses existing special beats for Days 5 and 6', () => {
    const dayFive = retentionCueForDay(5)
    const daySix = retentionCueForDay(6)

    expect(dayFive.newIngredients).toEqual(['tenderloin', 'enoki'])
    expect(dayFive.newRecipes).toEqual(['tenderloin'])
    expect(dayFive.specialBeat).toBe('特别人物登场')
    expect(dayFive.shortHook).toBe('特别人物登场')
    expect(daySix.newIngredients).toEqual([])
    expect(daySix.newRecipes).toEqual([])
    expect(daySix.specialBeat).toBe('明星同款热潮')
    expect(daySix.shortHook).toBe('明星同款热潮')
  })

  it('returns the next existing day and stops after Day 6', () => {
    expect(nextRetentionCue(1)?.day).toBe(2)
    expect(nextRetentionCue(5)?.day).toBe(6)
    expect(nextRetentionCue(6)).toBeNull()
    expect(() => retentionCueForDay(0)).toThrow('Unknown campaign day: 0')
    expect(() => retentionCueForDay(7)).toThrow('Unknown campaign day: 7')
  })
})
