import { en } from './en'
import { zhCN } from './zh-CN'

export const LOCALES = ['zh-CN', 'en'] as const
export const LOCALE_STORAGE_KEY = 'night-market-locale-v1'

export type Locale = typeof LOCALES[number]
export type TranslationKey = keyof typeof zhCN
export type TranslationValues = Record<string, string | number>
export type TFunction = (key: TranslationKey, values?: TranslationValues) => string

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  en,
}

export function normalizeLocale(value: unknown): Locale | null {
  return value === 'zh-CN' || value === 'en' ? value : null
}

export function localeFromSearch(search: string): Locale | null {
  return normalizeLocale(new URLSearchParams(search).get('lang'))
}

export function resolveInitialLocale(search: string, stored: string | null): Locale {
  return localeFromSearch(search) ?? normalizeLocale(stored) ?? 'zh-CN'
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  values: TranslationValues = {},
): string {
  return dictionaries[locale][key].replace(/\{([a-zA-Z0-9_]+)\}/g, (token, name: string) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token
  ))
}
