import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  LOCALE_STORAGE_KEY,
  localeFromSearch,
  resolveInitialLocale,
  translate,
  type Locale,
  type TFunction,
} from './core'
import { createDomainI18n, type DomainI18n } from './domain'
import { IS_POKI_BUILD } from '../platform/build'

export interface I18nContextValue {
  locale: Locale
  t: TFunction
  domain: DomainI18n
}

const defaultT: TFunction = (key, values) => translate('zh-CN', key, values)
const defaultValue: I18nContextValue = {
  locale: 'zh-CN',
  t: defaultT,
  domain: createDomainI18n(defaultT),
}

const I18nContext = createContext<I18nContextValue>(defaultValue)

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

export function I18nProvider({ children, locale: fixedLocale }: { children: ReactNode; locale?: Locale }) {
  const [resolvedLocale] = useState<Locale>(() => fixedLocale ?? resolveInitialLocale(
    typeof window === 'undefined' ? '' : window.location.search,
    typeof window === 'undefined' ? null : readStoredLocale(),
    IS_POKI_BUILD ? 'poki' : 'standalone',
  ))
  const locale = fixedLocale ?? resolvedLocale

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dataset.locale = locale
    document.title = translate(locale, 'metadata.title')
    document.querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute('content', translate(locale, 'metadata.description'))
    if (fixedLocale || localeFromSearch(window.location.search) === null) return
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // Locale preview still works when storage is unavailable.
    }
  }, [fixedLocale, locale])

  const value = useMemo<I18nContextValue>(() => {
    const t: TFunction = (key, values) => translate(locale, key, values)
    return { locale, t, domain: createDomainI18n(t) }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
