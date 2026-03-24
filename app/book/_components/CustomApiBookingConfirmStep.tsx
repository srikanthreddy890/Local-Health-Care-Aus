'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Loader2, User, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { fmtDate } from '@/lib/utils'
import { useBookingContext } from './BookingContext'
import { createStandardizedBookingParams } from '@/lib/customApi/customApiStandardFields'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface FamilyMember {
  id: string
  first_name: string
  last_name: string
  relationship: string
  email?: string | null
  mobile?: string | null
  date_of_birth?: string | null
}

interface UserProfile {
  first_name: string
  last_name: string
  email: string
  mobile: string
  date_of_birth?: string | null
}

interface Props {
  clinicId: string
  clinicName: string
  configId: string
  doctorId: string
  slotId: string
  userId: string
  onBooked: () => void
}

export default function CustomApiBookingConfirmStep({
  clinicId,
  clinicName,
  configId,
  doctorId,
  slotId,
  userId,
  onBooked,
}: Props) {
  const { data: bookingData } = useBookingContext()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const doctorName = bookingData.doctor
    ? `Dr. ${bookingData.doctor.first_name} ${bookingData.doctor.last_name}`
    : 'Doctor'
  const slotDate = bookingData.slot?.appointment_date ?? ''
  const slotTime = bookingData.slot?.start_time ?? ''

  // Load profile + family members
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const [profileRes, familyRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, email, mobile, date_of_birth')
          .eq('id', userId)
          .single(),
        supabase
          .from('family_members')
          .select('id, first_name, last_name, relationship, email, mobile, date_of_birth')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('first_name'),
      ])

      if (profileRes.data) setProfile(profileRes.data as UserProfile)
      setFamilyMembers((familyRes.data ?? []) as FamilyMember[])
    } catch {
      toast({ title: 'Failed to load profile', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Submit booking ────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!profile) return
    setSubmitting(true)

    try {
      const supabase = createClient()
      const selectedFamilyMember = familyMembers.find((fm) => fm.id === selectedFamilyMemberId)

      // Build patient data — use family member if selected, otherwise profile
      const patientData = selectedFamilyMember
        ? {
            patientFirstName: selectedFamilyMember.first_name,
            patientLastName: selectedFamilyMember.last_name,
            patientEmail: selectedFamilyMember.email ?? profile.email,
            patientMobile: selectedFamilyMember.mobile ?? profile.mobile,
            patientDob: selectedFamilyMember.date_of_birth ?? undefined,
          }
        : {
            patientFirstName: profile.first_name,
            patientLastName: profile.last_name,
            patientEmail: profile.email,
            patientMobile: profile.mobile,
            patientDob: profile.date_of_birth ?? undefined,
          }

      const standardParams = createStandardizedBookingParams({
        ...patientData,
        slotId,
        doctorId,
        appointmentDate: slotDate,
        appointmentTime: slotTime,
        notes: notes || undefined,
      })

      const { data, error } = await supabase.functions.invoke('book-custom-api-appointment', {
        body: {
          configId,
          clinicId,
          clinicName,
          userId,
          familyMemberId: selectedFamilyMemberId ?? undefined,
          ...standardParams,
        },
      })

      if (error) throw new Error(error.message)

      const bookingRef = data?.bookingId || data?.external_booking_id || 'your booking'
      toast({
        title: 'Booking confirmed!',
        description: `Reference: ${bookingRef}`,
      })
      onBooked()
    } catch (err) {
      toast({
        title: 'Booking failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary mr-2" />
          <span className="text-lhc-text-muted">Loading booking details...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-lhc-text-muted">Could not load your profile. Please try again.</p>
        </div>
      </div>
    )
  }

  function formatTime12h(time: string): string {
    if (!time) return ''
    const parts = time.split(':')
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-lhc-text-main">Confirm Your Booking</h2>
        <p className="text-sm text-lhc-text-muted mt-1">Review your appointment details</p>
      </div>

      {/* Appointment summary */}
      <div className="bg-lhc-primary/5 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-lhc-text-muted">Clinic</span>
          <span className="font-medium text-lhc-text-main">{clinicName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-lhc-text-muted">Doctor</span>
          <span className="font-medium text-lhc-text-main">{doctorName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-lhc-text-muted">Date</span>
          <span className="font-medium text-lhc-text-main">{slotDate ? fmtDate(slotDate) : ''}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-lhc-text-muted">Time</span>
          <span className="font-medium text-lhc-text-main">{formatTime12h(slotTime)}</span>
        </div>
      </div>

      {/* Patient / family member */}
      <div className="space-y-3">
        <Label>Booking for</Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="patient"
              checked={selectedFamilyMemberId === null}
              onChange={() => setSelectedFamilyMemberId(null)}
              className="accent-lhc-primary"
            />
            <User className="w-4 h-4 text-lhc-text-muted" />
            <span className="text-sm font-medium">
              {profile.first_name} {profile.last_name} (Myself)
            </span>
          </label>
          {familyMembers.map((fm) => (
            <label key={fm.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="patient"
                checked={selectedFamilyMemberId === fm.id}
                onChange={() => setSelectedFamilyMemberId(fm.id)}
                className="accent-lhc-primary"
              />
              <User className="w-4 h-4 text-lhc-text-muted" />
              <span className="text-sm font-medium">
                {fm.first_name} {fm.last_name}
                <span className="text-lhc-text-muted font-normal"> ({fm.relationship})</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="Any additional information for the clinic..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-lhc-primary hover:bg-lhc-primary/90 text-white h-12 text-base font-semibold"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Booking...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm Booking
          </>
        )}
      </Button>
    </div>
  )
}
