'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { isPharmacy } from '@/lib/utils/specializations'
import type { Doctor } from '../DoctorManagement'

const LANGUAGES = ['English', 'Mandarin', 'Cantonese', 'Hindi', 'Arabic', 'Vietnamese', 'Italian', 'Greek', 'Spanish', 'Korean', 'Japanese', 'French', 'Filipino', 'Punjabi', 'Bengali']

const SPECIALIZATIONS: Record<string, string[]> = {
  gp: ['General Practitioner', 'Family Medicine', 'Internal Medicine'],
  dental: ['General Dentist', 'Orthodontist', 'Periodontist', 'Endodontist', 'Prosthodontist', 'Oral Surgeon', 'Paediatric Dentist'],
  pharmacy: ['Pharmacist', 'Clinical Pharmacist', 'Compounding Pharmacist'],
  allied_health: ['Physiotherapist', 'Occupational Therapist', 'Speech Therapist', 'Dietitian', 'Podiatrist'],
  psychology: ['Psychologist', 'Clinical Psychologist', 'Counsellor', 'Psychiatrist'],
  physio: ['Physiotherapist', 'Sports Physiotherapist', 'Paediatric Physiotherapist'],
  specialist: ['Cardiologist', 'Dermatologist', 'Gastroenterologist', 'Neurologist', 'Oncologist', 'Orthopaedic Surgeon', 'Ophthalmologist', 'Paediatrician', 'Rheumatologist', 'Urologist'],
}

const ALL_SPECIALIZATIONS = [...new Set(Object.values(SPECIALIZATIONS).flat())].sort()

function getSpecializations(clinicType: string, subType: string): string[] {
  return SPECIALIZATIONS[subType] ?? SPECIALIZATIONS[clinicType] ?? ALL_SPECIALIZATIONS
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BIO_MAX_CHARS = 500

interface Props {
  doctor: Doctor
  onChange: (patch: Partial<Doctor>) => void
  clinicType: string
  subType: string
}

export default function BasicInfoTab({ doctor, onChange, clinicType, subType }: Props) {
  const clinicIsPharmacy = isPharmacy({ clinic_type: clinicType, sub_type: subType })
  const specializations = getSpecializations(clinicType, subType)
  const namePlaceholder = clinicIsPharmacy ? 'John Smith' : 'Dr. Full Name'
  const specLabel = clinicIsPharmacy ? 'Role' : 'Specialization'

  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleLanguage(lang: string) {
    const current = doctor.languages ?? []
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang]
    onChange({ languages: next })
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-selected
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 2 MB.')
      return
    }

    if (!doctor.dbId) {
      toast.error('Please save the doctor first before uploading a photo.')
      return
    }

    setUploading(true)
    try {
      // Create a canvas to resize/crop the image to a square
      const img = await loadImage(file)
      const canvas = document.createElement('canvas')
      const size = 256
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!

      // Crop to center square
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)

      // Export as WebP
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
          'image/webp',
          0.85,
        )
      })

      // Upload to Supabase storage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const filePath = `${doctor.dbId}/avatar.webp`

      const { error: uploadError } = await supabase.storage
        .from('doctor-avatars')
        .upload(filePath, blob, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-avatars')
        .getPublicUrl(filePath)

      // Bust cache by appending timestamp
      const avatarUrlWithCache = `${publicUrl}?t=${Date.now()}`

      // Update local state — will be persisted to DB when user clicks Save
      onChange({ avatar_url: avatarUrlWithCache })
      toast.success('Photo uploaded successfully!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemovePhoto() {
    if (!doctor.avatar_url || !doctor.dbId) return
    setRemoving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      await supabase.storage
        .from('doctor-avatars')
        .remove([`${doctor.dbId}/avatar.webp`])

      onChange({ avatar_url: null })
      toast.success('Photo removed.')
    } catch {
      toast.error('Failed to remove photo.')
    } finally {
      setRemoving(false)
    }
  }

  const bioLength = (doctor.bio ?? '').length
  const bioPercentage = bioLength / BIO_MAX_CHARS
  const selectedLanguages = doctor.languages ?? []

  return (
    <div className="space-y-5">
      {/* BI1 — Profile photo upload */}
      <div className="flex items-center gap-4">
        <div className="w-[60px] h-[60px] rounded-full shrink-0 overflow-hidden">
          {uploading ? (
            <div className="w-full h-full bg-[#DCFCE7] flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
            </div>
          ) : doctor.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.avatar_url} alt={doctor.name} className="w-full h-full object-cover" />
          ) : (
            <DefaultAvatar variant="doctor" className="w-full h-full rounded-full" />
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] px-3 py-1.5 rounded-[7px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" />Uploading...</>
              ) : (
                'Upload photo'
              )}
            </Button>
            {doctor.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] px-2 py-1.5 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleRemovePhoto}
                disabled={removing}
              >
                {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </Button>
            )}
          </div>
          <p className="text-[10px] text-lhc-text-muted mt-1">JPG or PNG &middot; max 2 MB &middot; Shown on your public listing</p>
        </div>
      </div>

      {/* BI2 — Full Name + Specialization in 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <Label className="text-[13px]">
            Full Name <span className="text-[12px] text-[#EF4444]">*</span>
          </Label>
          <Input
            placeholder={namePlaceholder}
            value={doctor.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="text-[13px] h-9 rounded-[9px] border-[var(--color-border-secondary,#E5E7EB)]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[13px]">
            {specLabel} <span className="text-[12px] text-[#EF4444]">*</span>
          </Label>
          <Select
            value={doctor.specialization}
            onValueChange={(v) => onChange({ specialization: v })}
          >
            <SelectTrigger className="text-[13px] h-9 rounded-[9px] border-[var(--color-border-secondary,#E5E7EB)]">
              <SelectValue placeholder={`Select ${specLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {specializations.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BI3 — Bio with character guidance */}
      <div className="space-y-1.5">
        <Label className="text-[13px]">Professional Bio</Label>
        <Textarea
          placeholder="Brief professional bio visible to patients on the booking page..."
          value={doctor.bio}
          onChange={(e) => {
            if (e.target.value.length <= BIO_MAX_CHARS) {
              onChange({ bio: e.target.value })
            }
          }}
          rows={3}
          className="text-[13px] min-h-[90px] resize-y rounded-[9px] border-[var(--color-border-secondary,#E5E7EB)] focus:ring-0 focus:shadow-[0_0_0_3px_rgba(0,168,107,0.15)]"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-lhc-text-muted">Shown on your public profile. Keep it under 200 words.</p>
          <p className={cn(
            'text-[11px]',
            bioPercentage > 0.8 ? 'text-[#D97706]' : 'text-lhc-text-muted',
          )}>
            {bioLength} / {BIO_MAX_CHARS} characters
          </p>
        </div>
      </div>

      {/* BI4 — Languages with count feedback */}
      <div className="space-y-2">
        <Label className="text-[13px]">Languages Spoken</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const selected = selectedLanguages.includes(lang)
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={cn(
                  'text-[12px] px-[13px] py-[5px] rounded-full transition-colors border',
                  selected
                    ? 'bg-[#00A86B] text-white border-[#00A86B]'
                    : 'bg-white text-[#6B7280] border-[#D1D5DB] hover:bg-[var(--color-background-secondary,#F9FAFB)]',
                )}
              >
                {lang}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-lhc-text-muted">
          {selectedLanguages.length === 0 ? (
            'No languages selected — add at least one'
          ) : (
            <>
              <span className="font-medium text-lhc-text-main">{selectedLanguages.length}</span> language{selectedLanguages.length !== 1 ? 's' : ''} selected &middot; Helps patients find a doctor who speaks their language
            </>
          )}
        </p>
      </div>
    </div>
  )
}

/** Helper to load an image from a File */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
