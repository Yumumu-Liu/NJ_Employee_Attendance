'use client'

import { ReactNode, useState, useEffect } from 'react'
import { I18nContext, Language, translations, getStoredLanguage, setStoredLanguage, type TranslationKey } from './i18n'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredLanguage()
    setLanguageState(stored)
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    setStoredLanguage(lang)
  }

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key
  }

  // Always render with default context value to avoid hydration mismatch
  return (
    <I18nContext.Provider value={{ language: mounted ? language : 'en', setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}
