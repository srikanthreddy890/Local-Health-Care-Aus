'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Accessibility,
  X,
  Type,
  Eye,
  MousePointer2,
  Link2,
  Space,
  PauseCircle,
  BookOpen,
  Contrast,
  Droplets,
  RotateCcw,
  Plus,
  Minus,
} from 'lucide-react'
import { useAccessibility } from '@/app/_components/providers/AccessibilityProvider'

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { settings, updateSetting, resetAll } = useAccessibility()

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Reading guide effect
  useEffect(() => {
    if (!settings.readingGuide) return
    const guide = document.createElement('div')
    guide.id = 'a11y-reading-guide-bar'
    guide.setAttribute('aria-hidden', 'true')
    Object.assign(guide.style, {
      position: 'fixed',
      left: '0',
      width: '100%',
      height: '12px',
      background: 'rgba(18, 183, 128, 0.18)',
      pointerEvents: 'none',
      zIndex: '99999',
      transition: 'top 0.05s linear',
    })
    document.body.appendChild(guide)

    const move = (e: MouseEvent) => {
      guide.style.top = `${e.clientY - 6}px`
    }
    document.addEventListener('mousemove', move)

    return () => {
      document.removeEventListener('mousemove', move)
      guide.remove()
    }
  }, [settings.readingGuide])

  const hasActiveSettings =
    settings.fontSize > 0 ||
    settings.highContrast ||
    settings.dyslexiaFont ||
    settings.largerCursor ||
    settings.highlightLinks ||
    settings.textSpacing ||
    settings.pauseAnimations ||
    settings.readingGuide ||
    settings.invertColors ||
    settings.saturation > 0

  return (
    <>
      {/* Skip to main content — always rendered */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100000] focus:rounded-lg focus:bg-lhc-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Floating trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close accessibility options' : 'Open accessibility options'}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="fixed bottom-5 left-5 z-[99998] flex h-14 w-14 items-center justify-center rounded-full bg-lhc-primary text-white shadow-lg transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
      >
        {open ? <X className="h-6 w-6" /> : <Accessibility className="h-6 w-6" />}
        {hasActiveSettings && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-orange-500" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-label="Accessibility options"
          className="fixed bottom-24 left-5 z-[99999] w-[340px] max-h-[80vh] overflow-y-auto rounded-2xl border border-lhc-border bg-lhc-surface shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-lhc-border bg-lhc-surface px-5 py-4 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-lhc-primary" />
              <h2 className="text-base font-semibold text-lhc-text-main">
                Accessibility
              </h2>
            </div>
            <button
              onClick={() => {
                resetAll()
              }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-lhc-text-muted hover:bg-lhc-background hover:text-lhc-text-main transition-colors"
              aria-label="Reset all accessibility settings"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-1 p-3">
            {/* Font size */}
            <div className="rounded-xl p-3 hover:bg-lhc-background/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Type className="h-4.5 w-4.5 text-lhc-primary" />
                  <span className="text-sm font-medium text-lhc-text-main">Font Size</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      updateSetting('fontSize', Math.max(0, settings.fontSize - 1))
                    }
                    disabled={settings.fontSize === 0}
                    aria-label="Decrease font size"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-lhc-border text-lhc-text-main hover:bg-lhc-background disabled:opacity-30 transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-semibold text-lhc-text-main">
                    {settings.fontSize === 0 ? 'A' : `+${settings.fontSize}`}
                  </span>
                  <button
                    onClick={() =>
                      updateSetting('fontSize', Math.min(4, settings.fontSize + 1))
                    }
                    disabled={settings.fontSize === 4}
                    aria-label="Increase font size"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-lhc-border text-lhc-text-main hover:bg-lhc-background disabled:opacity-30 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Toggle options */}
            <ToggleRow
              icon={<Eye className="h-4.5 w-4.5" />}
              label="High Contrast"
              description="Sharper text and borders"
              active={settings.highContrast}
              onToggle={() => updateSetting('highContrast', !settings.highContrast)}
            />
            <ToggleRow
              icon={<BookOpen className="h-4.5 w-4.5" />}
              label="Dyslexia Friendly"
              description="Easier-to-read font"
              active={settings.dyslexiaFont}
              onToggle={() => updateSetting('dyslexiaFont', !settings.dyslexiaFont)}
            />
            <ToggleRow
              icon={<MousePointer2 className="h-4.5 w-4.5" />}
              label="Large Cursor"
              description="Bigger mouse pointer"
              active={settings.largerCursor}
              onToggle={() => updateSetting('largerCursor', !settings.largerCursor)}
            />
            <ToggleRow
              icon={<Link2 className="h-4.5 w-4.5" />}
              label="Highlight Links"
              description="Underline and outline all links"
              active={settings.highlightLinks}
              onToggle={() => updateSetting('highlightLinks', !settings.highlightLinks)}
            />
            <ToggleRow
              icon={<Space className="h-4.5 w-4.5" />}
              label="Text Spacing"
              description="Increase letter and line spacing"
              active={settings.textSpacing}
              onToggle={() => updateSetting('textSpacing', !settings.textSpacing)}
            />
            <ToggleRow
              icon={<PauseCircle className="h-4.5 w-4.5" />}
              label="Pause Animations"
              description="Stop all motion and transitions"
              active={settings.pauseAnimations}
              onToggle={() =>
                updateSetting('pauseAnimations', !settings.pauseAnimations)
              }
            />
            <ToggleRow
              icon={<BookOpen className="h-4.5 w-4.5" />}
              label="Reading Guide"
              description="Line highlight follows your cursor"
              active={settings.readingGuide}
              onToggle={() => updateSetting('readingGuide', !settings.readingGuide)}
            />
            <ToggleRow
              icon={<Contrast className="h-4.5 w-4.5" />}
              label="Invert Colors"
              description="Reverse all page colors"
              active={settings.invertColors}
              onToggle={() => updateSetting('invertColors', !settings.invertColors)}
            />

            {/* Saturation */}
            <div className="rounded-xl p-3 hover:bg-lhc-background/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Droplets className="h-4.5 w-4.5 text-lhc-primary" />
                  <div>
                    <span className="text-sm font-medium text-lhc-text-main">
                      Saturation
                    </span>
                    <p className="text-xs text-lhc-text-muted">
                      Adjust color intensity
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {(['Default', 'Low', 'Grey'] as const).map((label, i) => (
                    <button
                      key={label}
                      onClick={() => updateSetting('saturation', i)}
                      aria-pressed={settings.saturation === i}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        settings.saturation === i
                          ? 'bg-lhc-primary text-white'
                          : 'border border-lhc-border text-lhc-text-muted hover:bg-lhc-background'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-lhc-border px-5 py-3">
            <p className="text-[11px] text-lhc-text-muted leading-relaxed">
              These settings are saved on this device and will persist across visits.
              Press <kbd className="rounded border border-lhc-border px-1 py-0.5 text-[10px] font-mono">Esc</kbd> to close.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Toggle row sub-component ─────────────────────────────────── */

function ToggleRow({
  icon,
  label,
  description,
  active,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  description: string
  active: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      aria-label={label}
      className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-lhc-background/60 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <span className={active ? 'text-lhc-primary' : 'text-lhc-text-muted'}>
          {icon}
        </span>
        <div>
          <span className="text-sm font-medium text-lhc-text-main">{label}</span>
          <p className="text-xs text-lhc-text-muted">{description}</p>
        </div>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          active ? 'bg-lhc-primary' : 'bg-lhc-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            active ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}
