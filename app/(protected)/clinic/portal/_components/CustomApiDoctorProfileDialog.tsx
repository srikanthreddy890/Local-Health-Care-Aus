'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, Stethoscope, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Doctor } from './DoctorManagement'

interface Props {
  doctor: Doctor
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
}

/* ── Preset avatar builder ─────────────────────────────────────────────── */

function buildAvatarSvg(bgFrom: string, bgTo: string, skinTone: string, coatColor: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgFrom}"/>
        <stop offset="100%" stop-color="${bgTo}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" rx="100" fill="url(%23bg)"/>
    <circle cx="100" cy="72" r="32" fill="${skinTone}"/>
    <path d="M40 200 C40 155 65 135 100 135 C135 135 160 155 160 200Z" fill="${coatColor}"/>
    <circle cx="100" cy="72" r="28" fill="${skinTone}" opacity="0.9"/>
    <ellipse cx="90" cy="70" rx="3" ry="3.5" fill="${accent}" opacity="0.8"/>
    <ellipse cx="110" cy="70" rx="3" ry="3.5" fill="${accent}" opacity="0.8"/>
    <path d="M94 82 Q100 88 106 82" stroke="${accent}" stroke-width="2" fill="none" opacity="0.6"/>
    <path d="M70 140 L100 165 L90 140Z" fill="white" opacity="0.25"/>
    <path d="M130 140 L100 165 L110 140Z" fill="white" opacity="0.25"/>
    <circle cx="100" cy="165" r="4" fill="${accent}" opacity="0.5"/>
  </svg>`
}

function svgToDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\n\s*/g, ''))
}

const PRESET_AVATARS = [
  {
    id: 'blue-male',
    label: 'Blue Coat',
    ring: 'ring-blue-400',
    bg: 'bg-gradient-to-br from-blue-100 to-blue-200',
    url: svgToDataUri(buildAvatarSvg('#DBEAFE', '#93C5FD', '#FDDCB5', '#3B82F6', '#1E3A5F')),
  },
  {
    id: 'rose-female',
    label: 'Rose Coat',
    ring: 'ring-rose-400',
    bg: 'bg-gradient-to-br from-rose-100 to-rose-200',
    url: svgToDataUri(buildAvatarSvg('#FFE4E6', '#FDA4AF', '#F5D0B0', '#E11D48', '#4C0519')),
  },
  {
    id: 'teal-dentist',
    label: 'Teal Coat',
    ring: 'ring-teal-400',
    bg: 'bg-gradient-to-br from-teal-100 to-teal-200',
    url: svgToDataUri(buildAvatarSvg('#CCFBF1', '#5EEAD4', '#D4A574', '#0D9488', '#134E4A')),
  },
  {
    id: 'violet-specialist',
    label: 'Violet Coat',
    ring: 'ring-violet-400',
    bg: 'bg-gradient-to-br from-violet-100 to-violet-200',
    url: svgToDataUri(buildAvatarSvg('#EDE9FE', '#C4B5FD', '#E8C5A0', '#7C3AED', '#2E1065')),
  },
  {
    id: 'amber-warm',
    label: 'Amber Coat',
    ring: 'ring-amber-400',
    bg: 'bg-gradient-to-br from-amber-100 to-amber-200',
    url: svgToDataUri(buildAvatarSvg('#FEF3C7', '#FCD34D', '#C8956C', '#D97706', '#451A03')),
  },
  {
    id: 'emerald-surgeon',
    label: 'Emerald Coat',
    ring: 'ring-emerald-400',
    bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200',
    url: svgToDataUri(buildAvatarSvg('#D1FAE5', '#6EE7B7', '#F0C9A0', '#059669', '#022C22')),
  },
]

export default function CustomApiDoctorProfileDialog({ doctor, isOpen, onClose, onSaved, clinicId }: Props) {
  const [bio, setBio] = useState(doctor.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(doctor.avatar_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayName = doctor.name.startsWith('Dr') ? doctor.name : `Dr. ${doctor.name}`

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `doctor-avatars/${clinicId}/${doctor.dbId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('clinic-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If bucket doesn't exist, use a URL-based fallback
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
          toast.error('Image storage not configured. Please use an image URL instead.')
          return
        }
        throw uploadError
      }

      const { data: urlData } = supabase.storage
        .from('clinic-assets')
        .getPublicUrl(filePath)

      setAvatarUrl(urlData.publicUrl)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function selectPresetAvatar(url: string) {
    setAvatarUrl(url)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('update_custom_api_doctor_profile', {
        p_doctor_id: doctor.dbId,
        p_clinic_id: clinicId,
        p_bio: bio || null,
        p_avatar_url: avatarUrl || null,
      })

      if (error) throw error

      toast.success('Doctor profile updated')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Doctor Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Read-only name */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-lhc-primary/10 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Stethoscope className="w-5 h-5 text-lhc-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{displayName}</p>
              {doctor.specialization && (
                <p className="text-xs text-lhc-text-muted">{doctor.specialization}</p>
              )}
              <p className="text-[10px] text-lhc-text-muted mt-0.5">Name synced from external system</p>
            </div>
          </div>

          {/* Profile photo */}
          <div className="space-y-3">
            <Label>Profile Photo</Label>

            {/* Current photo preview */}
            {avatarUrl && (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-lhc-border shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs"
                >
                  Remove
                </Button>
              </div>
            )}

            {/* Upload button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs"
              >
                {uploading ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-3 h-3 mr-1" /> Upload Photo</>
                )}
              </Button>
            </div>

            {/* Preset avatar grid */}
            <div>
              <p className="text-xs text-lhc-text-muted mb-2">Or choose a preset avatar:</p>
              <div className="flex flex-wrap gap-3">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = avatarUrl === av.url
                  return (
                    <button
                      key={av.id}
                      onClick={() => selectPresetAvatar(av.url)}
                      title={av.label}
                      className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-200 hover:scale-110 ${
                        isSelected
                          ? `border-lhc-primary ring-2 ${av.ring} shadow-lg scale-110`
                          : 'border-gray-200 hover:border-gray-300 shadow-sm'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <Label>Profile Description</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Add a description about this doctor for patients to see..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
