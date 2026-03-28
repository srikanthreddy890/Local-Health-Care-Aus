'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'

export interface AccessibilitySettings {
  fontSize: number          // 0 = default, 1–4 = increase steps
  highContrast: boolean
  dyslexiaFont: boolean
  largerCursor: boolean
  highlightLinks: boolean
  textSpacing: boolean
  pauseAnimations: boolean
  readingGuide: boolean
  invertColors: boolean
  saturation: number        // 0 = default, 1 = low, 2 = desaturate
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 0,
  highContrast: false,
  dyslexiaFont: false,
  largerCursor: false,
  highlightLinks: false,
  textSpacing: false,
  pauseAnimations: false,
  readingGuide: false,
  invertColors: false,
  saturation: 0,
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => void
  resetAll: () => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

const STORAGE_KEY = 'lhc-accessibility'

function loadSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  // Load persisted settings on mount
  useEffect(() => {
    setSettings(loadSettings())
    setMounted(true)
  }, [])

  // Persist & apply classes whenever settings change
  useEffect(() => {
    if (!mounted) return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    const root = document.documentElement

    // Font size
    root.classList.remove('a11y-font-1', 'a11y-font-2', 'a11y-font-3', 'a11y-font-4')
    if (settings.fontSize > 0) {
      root.classList.add(`a11y-font-${settings.fontSize}`)
    }

    // Toggle classes
    const toggleMap: [keyof AccessibilitySettings, string][] = [
      ['highContrast', 'a11y-high-contrast'],
      ['dyslexiaFont', 'a11y-dyslexia-font'],
      ['largerCursor', 'a11y-large-cursor'],
      ['highlightLinks', 'a11y-highlight-links'],
      ['textSpacing', 'a11y-text-spacing'],
      ['pauseAnimations', 'a11y-pause-animations'],
      ['readingGuide', 'a11y-reading-guide'],
      ['invertColors', 'a11y-invert'],
    ]

    for (const [key, cls] of toggleMap) {
      root.classList.toggle(cls, !!settings[key])
    }

    // Saturation
    root.classList.remove('a11y-low-saturation', 'a11y-desaturate')
    if (settings.saturation === 1) root.classList.add('a11y-low-saturation')
    if (settings.saturation === 2) root.classList.add('a11y-desaturate')
  }, [settings, mounted])

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const resetAll = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting, resetAll }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used inside AccessibilityProvider')
  return ctx
}
