'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { DomTranslator } from '@/lib/translation/domTranslator'

/* ── Language definitions ─────────────────────────────────────── */
export interface Language {
  code: string
  label: string
  flag: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',            flag: '🇺🇸' },
  { code: 'zh-CN', label: '中文 (简体)',      flag: '🇨🇳' },
  { code: 'zh-TW', label: '中文 (繁體)',      flag: '🇹🇼' },
  { code: 'hi', label: 'हिन्दी',              flag: '🇮🇳' },
  { code: 'id', label: 'Bahasa Indonesia',   flag: '🇮🇩' },
  { code: 'th', label: 'ไทย',                flag: '🇹🇭' },
  { code: 'it', label: 'Italiano',           flag: '🇮🇹' },
  { code: 'es', label: 'Español',            flag: '🇪🇸' },
]

const STORAGE_KEY = 'lhc-language'

/* ── Context ──────────────────────────────────────────────────── */
interface LanguageContextValue {
  current: Language
  isTranslating: boolean
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  current: LANGUAGES[0],
  isTranslating: false,
  setLanguage: () => {},
})

export const useLanguage = () => useContext(LanguageContext)

/* ── Provider ─────────────────────────────────────────────────── */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Language>(LANGUAGES[0])
  const [isTranslating, setIsTranslating] = useState(false)
  const translatorRef = useRef<DomTranslator | null>(null)
  const initialApplied = useRef(false)

  // Create translator instance and start observing
  useEffect(() => {
    const translator = new DomTranslator()
    translatorRef.current = translator
    translator.observe()
    return () => {
      translator.disconnect()
      translatorRef.current = null
    }
  }, [])

  // Restore saved language preference and apply on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && saved !== 'en') {
        const lang = LANGUAGES.find(l => l.code === saved)
        if (lang) {
          setCurrent(lang)
        }
      }
    } catch {}
  }, [])

  // Apply saved language after initial render (once)
  useEffect(() => {
    if (current.code === 'en' || initialApplied.current || !translatorRef.current) return
    initialApplied.current = true

    const applyInitial = async () => {
      setIsTranslating(true)
      try {
        await translatorRef.current?.translate(current.code)
      } finally {
        setIsTranslating(false)
      }
    }

    // Delay slightly to ensure DOM is fully rendered
    const timer = setTimeout(applyInitial, 300)
    return () => clearTimeout(timer)
  }, [current.code])

  const setLanguage = useCallback(async (lang: Language) => {
    setCurrent(lang)
    try { localStorage.setItem(STORAGE_KEY, lang.code) } catch {}

    const translator = translatorRef.current
    if (!translator) return

    setIsTranslating(true)
    try {
      // Always restore to English first
      translator.restore()

      // Then translate if not English
      if (lang.code !== 'en') {
        // Small delay for DOM to settle after restore
        await new Promise(r => setTimeout(r, 50))
        await translator.translate(lang.code)
      }
    } finally {
      setIsTranslating(false)
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ current, isTranslating, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
