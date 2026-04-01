'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building2,
  Clock,
  Stethoscope,
  UserRound,
  PartyPopper,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TimeSlot {
  open: string
  close: string
}

interface DaySchedule {
  closed: boolean
  slots: TimeSlot[]
}

interface OperatingHoursData {
  timezone: string
  [day: string]: DaySchedule | string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}

const DEFAULT_HOURS: OperatingHoursData = {
  timezone: 'Australia/Sydney',
  ...Object.fromEntries(
    DAYS.map((day) => [
      day,
      {
        closed: day === 'saturday' || day === 'sunday',
        slots: (day === 'saturday' || day === 'sunday') ? [] : [{ open: '09:00', close: '17:00' }],
      },
    ]),
  ),
}

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Basic Info', icon: Building2 },
  { label: 'Hours', icon: Clock },
  { label: 'Services', icon: Stethoscope },
  { label: 'First Doctor', icon: UserRound },
  { label: 'Complete', icon: CheckCircle2 },
]

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  clinicId: string
}

export default function ClinicOnboarding({ clinicId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — Basic Info
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
  })

  // Step 2 — Hours
  const [hours, setHours] = useState<OperatingHoursData>(DEFAULT_HOURS)

  // Step 3 — Services (at least one)
  const [services, setServices] = useState([{ name: '', price: '', duration: '30' }])

  // Step 4 — First Doctor
  const [doctor, setDoctor] = useState({
    first_name: '',
    last_name: '',
    specialty: '',
    ahpra_number: '',
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function toggleDayClosed(day: string) {
    setHours((prev) => {
      const d = prev[day] as DaySchedule
      const closed = !d.closed
      return { ...prev, [day]: { closed, slots: closed ? [] : [{ open: '09:00', close: '17:00' }] } }
    })
  }

  function setSlotTime(day: string, field: 'open' | 'close', value: string) {
    setHours((prev) => {
      const d = prev[day] as DaySchedule
      const slots = d.slots.length > 0 ? [{ ...d.slots[0], [field]: value }] : [{ open: '09:00', close: '17:00', [field]: value }]
      return { ...prev, [day]: { ...d, slots } }
    })
  }

  function addService() {
    setServices((prev) => [...prev, { name: '', price: '', duration: '30' }])
  }

  function setService(index: number, field: string, value: string) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Step saves ───────────────────────────────────────────────────────────────

  async function saveBasicInfo() {
    if (!basicInfo.name) { toast.error('Clinic name is required.'); return false }
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('clinics')
        .update({
          name: basicInfo.name,
          description: basicInfo.description || null,
          phone: basicInfo.phone || null,
          email: basicInfo.email || null,
          website: basicInfo.website || null,
        })
        .eq('id', clinicId)
      if (error) throw error
      return true
    } catch {
      toast.error('Failed to save basic info.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveHours() {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('clinics')
        .update({ operating_hours: hours })
        .eq('id', clinicId)
      if (error) throw error
      return true
    } catch {
      toast.error('Failed to save hours.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveServices() {
    const valid = services.filter((s) => s.name.trim())
    if (!valid.length) { toast.error('Add at least one service.'); return false }
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const rows = valid.map((s) => ({
        clinic_id: clinicId,
        name: s.name.trim(),
        price: s.price ? parseFloat(s.price) : null,
        duration_minutes: parseInt(s.duration, 10) || 30,
        is_active: true,
      }))
      const { error } = await supabase.from('services').insert(rows)
      if (error) throw error
      return true
    } catch {
      toast.error('Failed to save services.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveDoctor() {
    if (!doctor.first_name || !doctor.last_name) {
      toast.error('Doctor first and last name are required.')
      return false
    }
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase.from('doctors').insert({
        clinic_id: clinicId,
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        specialty: doctor.specialty || null,
        ahpra_number: doctor.ahpra_number || null,
        is_active: true,
      })
      if (error) throw error
      return true
    } catch {
      toast.error('Failed to save doctor.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function completeOnboarding() {
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('clinics')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', clinicId)
      if (error) throw error
      posthog.capture('clinic_onboarding_completed', {
        clinic_id: clinicId,
        services_count: services.filter((s) => s.name.trim()).length,
      })
      toast.success('Setup complete! Welcome to your clinic portal.')
      router.refresh()
    } catch {
      toast.error('Failed to complete onboarding.')
    } finally {
      setSaving(false)
    }
  }

  async function handleNext() {
    let ok = true
    if (step === 1) ok = await saveBasicInfo()
    else if (step === 2) ok = await saveHours()
    else if (step === 3) ok = await saveServices()
    else if (step === 4) ok = await saveDoctor()
    if (ok) setStep((s) => Math.min(s + 1, 5))
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1))
  }

  async function handleSkip() {
    setStep((s) => Math.min(s + 1, 5))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-lhc-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        {/* Progress header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-lhc-text-muted">
              Step {step} of {STEPS.length}
            </span>
            <Badge variant="secondary">{STEPS[step - 1].label}</Badge>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Step icons */}
          <div className="flex justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = step > i + 1
              const active = step === i + 1
              return (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                      done
                        ? 'bg-lhc-primary border-lhc-primary text-white'
                        : active
                          ? 'border-lhc-primary text-lhc-primary bg-lhc-primary/10'
                          : 'border-lhc-border text-lhc-text-muted',
                    )}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-lhc-text-muted hidden sm:block">{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <Card>
          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="text-lhc-text-main">Basic information</CardTitle>
                <CardDescription>Tell patients about your clinic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-name">Clinic name <span className="text-red-500">*</span></Label>
                  <Input
                    id="ob-name"
                    placeholder="e.g. Sunrise Medical Centre"
                    value={basicInfo.name}
                    onChange={(e) => setBasicInfo((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-desc">Description</Label>
                  <Textarea
                    id="ob-desc"
                    placeholder="A brief overview of your clinic…"
                    rows={3}
                    value={basicInfo.description}
                    onChange={(e) => setBasicInfo((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-phone">Phone</Label>
                    <Input
                      id="ob-phone"
                      type="tel"
                      placeholder="(02) 9000 0000"
                      value={basicInfo.phone}
                      onChange={(e) => setBasicInfo((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ob-email">Email</Label>
                    <Input
                      id="ob-email"
                      type="email"
                      placeholder="clinic@example.com"
                      value={basicInfo.email}
                      onChange={(e) => setBasicInfo((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-website">Website</Label>
                  <Input
                    id="ob-website"
                    type="url"
                    placeholder="https://yourclinic.com.au"
                    value={basicInfo.website}
                    onChange={(e) => setBasicInfo((p) => ({ ...p, website: e.target.value }))}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 2: Hours ── */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="text-lhc-text-main">Opening hours</CardTitle>
                <CardDescription>Set your regular trading hours for each day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map((day) => {
                  const d = hours[day] as DaySchedule
                  const slot = d.slots[0]
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-lhc-text-main font-medium">{DAY_LABELS[day]}</div>
                      <input
                        type="checkbox"
                        id={`closed-${day}`}
                        checked={d.closed}
                        onChange={() => toggleDayClosed(day)}
                        className="accent-lhc-primary"
                      />
                      <Label htmlFor={`closed-${day}`} className="text-xs text-lhc-text-muted w-12">
                        Closed
                      </Label>
                      {!d.closed && slot && (
                        <>
                          <Input
                            type="time"
                            value={slot.open}
                            onChange={(e) => setSlotTime(day, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-lhc-text-muted text-sm">—</span>
                          <Input
                            type="time"
                            value={slot.close}
                            onChange={(e) => setSlotTime(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </>
          )}

          {/* ── Step 3: Services ── */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="text-lhc-text-main">Services</CardTitle>
                <CardDescription>Add the services your clinic offers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {services.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5 space-y-1.5">
                      {i === 0 && <Label>Service name</Label>}
                      <Input
                        placeholder="e.g. General Consultation"
                        value={s.name}
                        onChange={(e) => setService(i, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      {i === 0 && <Label>Price ($)</Label>}
                      <Input
                        type="number"
                        placeholder="80.00"
                        value={s.price}
                        onChange={(e) => setService(i, 'price', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      {i === 0 && <Label>Duration (min)</Label>}
                      <Input
                        type="number"
                        placeholder="30"
                        value={s.duration}
                        onChange={(e) => setService(i, 'duration', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      {services.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(i)}
                          className="text-red-500 hover:text-red-600"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addService}>
                  + Add another service
                </Button>
              </CardContent>
            </>
          )}

          {/* ── Step 4: First Doctor ── */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="text-lhc-text-main">Add your first doctor</CardTitle>
                <CardDescription>
                  You can add more doctors later in the Doctors tab.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-first">First name <span className="text-red-500">*</span></Label>
                    <Input
                      id="doc-first"
                      placeholder="Jane"
                      value={doctor.first_name}
                      onChange={(e) => setDoctor((p) => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-last">Last name <span className="text-red-500">*</span></Label>
                    <Input
                      id="doc-last"
                      placeholder="Smith"
                      value={doctor.last_name}
                      onChange={(e) => setDoctor((p) => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-specialty">Specialty</Label>
                  <Input
                    id="doc-specialty"
                    placeholder="e.g. General Practitioner"
                    value={doctor.specialty}
                    onChange={(e) => setDoctor((p) => ({ ...p, specialty: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="doc-ahpra">AHPRA number</Label>
                  <Input
                    id="doc-ahpra"
                    placeholder="MED0001234567"
                    value={doctor.ahpra_number}
                    onChange={(e) => setDoctor((p) => ({ ...p, ahpra_number: e.target.value }))}
                  />
                </div>
              </CardContent>
            </>
          )}

          {/* ── Step 5: Complete ── */}
          {step === 5 && (
            <>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-3">
                  <PartyPopper className="w-10 h-10 text-lhc-primary" />
                </div>
                <CardTitle className="text-lhc-text-main text-2xl">You&apos;re all set!</CardTitle>
                <CardDescription>
                  Your clinic is ready. Click below to open your portal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <Button onClick={completeOnboarding} disabled={saving} size="lg">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finishing up…
                    </>
                  ) : (
                    <>
                      Go to clinic portal
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || saving}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={handleSkip} disabled={saving}>
                  Skip
                </Button>
              )}
              <Button onClick={handleNext} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {step === 4 ? 'Save & Continue' : 'Next'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
