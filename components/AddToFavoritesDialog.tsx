'use client'

import { useState, useEffect } from 'react'
import { X, Heart, Loader2 } from 'lucide-react'

const SUGGESTION_CHIPS = ['My Dentist', 'Family Doctor', "Kids' Clinic", 'Specialist', 'Emergency Care']
const MAX_NOTES = 200

interface Props {
  isOpen: boolean
  onClose: () => void
  clinicName: string
  initialCustomName?: string
  initialNotes?: string
  onSave: (customName: string, notes: string) => Promise<boolean>
  isEditing?: boolean
}

export default function AddToFavoritesDialog({
  isOpen,
  onClose,
  clinicName,
  initialCustomName = '',
  initialNotes = '',
  onSave,
  isEditing = false,
}: Props) {
  const [customName, setCustomName] = useState(initialCustomName)
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCustomName(initialCustomName)
      setNotes(initialNotes)
    }
  }, [isOpen, initialCustomName, initialNotes])

  if (!isOpen) return null

  async function handleSave() {
    setSaving(true)
    try {
      const ok = await onSave(customName.trim(), notes.trim())
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (saving) return
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lhc-border">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-lhc-primary" />
            <h2 className="font-bold text-lhc-text-main text-sm">
              {isEditing ? 'Edit Favorite' : 'Add to Favorites'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-lhc-text-muted hover:text-lhc-text-main transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-lhc-text-muted">
            {isEditing ? 'Update your saved label for' : 'Saving'}{' '}
            <strong className="text-lhc-text-main">{clinicName}</strong>
          </p>

          {/* Custom name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider">
              Custom Label <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={clinicName}
              maxLength={60}
              className="w-full border border-lhc-border rounded-xl px-4 py-2.5 text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors"
            />
          </div>

          {/* Suggestion chips — add mode only */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setCustomName(chip)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    customName === chip
                      ? 'bg-lhc-primary text-white border-lhc-primary'
                      : 'bg-lhc-background text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider">
                Notes <span className="font-normal">(optional)</span>
              </label>
              <span className={`text-xs ${notes.length > MAX_NOTES - 20 ? 'text-red-500' : 'text-lhc-text-muted'}`}>
                {notes.length}/{MAX_NOTES}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
              placeholder="e.g. Great for kids, near work, bulk billing…"
              rows={3}
              className="w-full border border-lhc-border rounded-xl px-4 py-2.5 text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 border border-lhc-border rounded-xl text-sm font-semibold text-lhc-text-muted hover:border-lhc-primary hover:text-lhc-text-main transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-11 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
