import { describe, expect, it } from 'vitest'
import { en } from './en'
import { normalizeLocale, resolveInitialLocale, translate } from './core'
import { zhCN } from './zh-CN'

describe('i18n core', () => {
  it('normalizes only supported locales', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh-CN')
    expect(normalizeLocale('en')).toBe('en')
    expect(normalizeLocale('fr')).toBeNull()
    expect(normalizeLocale(null)).toBeNull()
  })

  it('uses query, then storage, then the Chinese default', () => {
    expect(resolveInitialLocale('?lang=en', 'zh-CN')).toBe('en')
    expect(resolveInitialLocale('?lang=zh-CN', 'en')).toBe('zh-CN')
    expect(resolveInitialLocale('?lang=fr', 'en')).toBe('en')
    expect(resolveInitialLocale('', null)).toBe('zh-CN')
  })

  it('keeps both dictionaries key-complete and interpolates values', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort())
    expect(translate('en', 'hud.orders', { served: 2, target: 5 })).toBe('Orders 2/5')
    expect(translate('zh-CN', 'hud.orders', { served: 2, target: 5 })).toBe('订单 2/5')
  })

  it('uses the approved English title and player-facing terminology', () => {
    expect(en['app.name']).toBe('Night Market: Street Food Stall')
    expect(en['select.title']).toBe('Select a Day')
    expect(en['select.daysLabel']).not.toBe('Business days')
    expect(en['upgrade.funds']).toBe('Cash')
    expect(en['summary.coins']).toBe('Cash')

    const englishCopy = Object.values(en).join('\n').replace(/\{[^}]+\}/g, '')
    expect(englishCopy).not.toMatch(/\bcoins?\b/i)
    expect(englishCopy).not.toMatch(/Club Senior|Orleans Chicken|Buldak/i)
  })
})
