'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, Check, Loader2 } from 'lucide-react'
import { useLanguage, LANGUAGES } from '@/app/_components/providers/LanguageProvider'

interface LanguageSelectorProps {
  /** Render as a compact button (header) or a full-width row (mobile drawer) */
  variant?: 'compact' | 'full'
  onSelect?: () => void
}

export default function LanguageSelector({ variant = 'compact', onSelect }: LanguageSelectorProps) {
  const { current, isTranslating, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative notranslate" data-no-translate>
      {/* Trigger button */}
      <button
        onClick={() => !isTranslating && setOpen(o => !o)}
        disabled={isTranslating}
        className={
          variant === 'compact'
            ? 'flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors px-2 py-1.5 rounded-lg hover:bg-lhc-background disabled:opacity-60'
            : 'flex items-center gap-2.5 w-full px-3.5 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60'
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.code === 'en' ? 'EN' : current.label}</span>
        {isTranslating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {open && !isTranslating && (
        <div
          className={`absolute z-[200] mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 min-w-[200px] ${
            variant === 'compact' ? 'right-0' : 'left-0'
          }`}
          role="listbox"
          aria-label="Language options"
        >
          {LANGUAGES.map(lang => {
            const isActive = lang.code === current.code
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  if (lang.code !== current.code) {
                    setLanguage(lang)
                  }
                  setOpen(false)
                  onSelect?.()
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-lhc-primary font-medium bg-[#F0FDF4]'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isActive ? (
                  <Check className="w-4 h-4 text-lhc-primary shrink-0" />
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <span className="text-base leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
