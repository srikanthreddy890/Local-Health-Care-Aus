'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { isPharmacy } from '@/lib/utils/specializations'
import type { Doctor } from '../DoctorManagement'

const LANGUAGES = ['English', 'Mandarin', 'Cantonese', 'Hindi', 'Arabic', 'Vietnamese', 'Italian', 'Greek', 'Spanish', 'Korean', 'Japanese', 'French', 'Filipino', 'Punjabi', 'Bengali']

// Specializations by clinic type
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

interface Props {
  doctor: Doctor
  onChange: (patch: Partial<Doctor>) => void
  clinicType: string
  subType: string
}

export default function BasicInfoTab({ doctor, onChange, clinicType, subType }: Props) {
  const clinicIsPharmacy = isPharmacy({ clinic_type: clinicType, sub_type: subType })
  const specializations = getSpecializations(clinicType, subType)
  const namePlaceholder = clinicIsPharmacy ? 'John Smith' : 'Dr. John Smith'
  const specLabel = clinicIsPharmacy ? 'Role' : 'Specialization'

  function toggleLanguage(lang: string) {
    const current = doctor.languages ?? []
    const next = current.includes(lang)
      ? current.filter((l) => l !== lang)
      : [...current, lang]
    onChange({ languages: next })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input
          placeholder={namePlaceholder}
          value={doctor.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{specLabel}</Label>
        <Select
          value={doctor.specialization}
          onValueChange={(v) => onChange({ specialization: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${specLabel.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {specializations.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Bio</Label>
        <Textarea
          placeholder="Brief professional bio…"
          value={doctor.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Languages Spoken</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => {
            const selected = (doctor.languages ?? []).includes(lang)
            return (
              <Button
                key={lang}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleLanguage(lang)}
              >
                {lang}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
