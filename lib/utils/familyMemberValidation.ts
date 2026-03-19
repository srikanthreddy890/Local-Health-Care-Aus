'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import type { FamilyMember } from '@/lib/hooks/useFamilyMembers'

const REQUIRED_FIELDS: (keyof FamilyMember)[] = [
  'first_name',
  'last_name',
  'email',
  'mobile',
  'date_of_birth',
  'address_line1',
  'city',
  'state',
  'postcode',
]

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  mobile: 'Mobile',
  date_of_birth: 'Date of birth',
  address_line1: 'Address',
  city: 'City',
  state: 'State',
  postcode: 'Postcode',
}

export interface ValidationResult {
  isComplete: boolean
  missingFields: string[]
}

export interface BookingProfileData {
  firstName: string
  lastName: string
  email: string
  mobile: string
  dob: string
  address: {
    line1: string
    line2: string | null
    city: string
    state: string
    postcode: string
    country: string | null
  }
}

export interface BookingValidationResult extends ValidationResult {
  profileData?: BookingProfileData
}

export function validateFamilyMemberProfile(member: FamilyMember): ValidationResult {
  const missingFields: string[] = []
  for (const field of REQUIRED_FIELDS) {
    const value = member[field]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(FIELD_LABELS[field as string] ?? String(field))
    }
  }
  return { isComplete: missingFields.length === 0, missingFields }
}

export async function validateFamilyMemberForBooking(familyMemberId: string): Promise<BookingValidationResult> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('family_members')
    .select('*')
    .eq('id', familyMemberId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return { isComplete: false, missingFields: ['Family member not found'] }
  }

  const member = data as FamilyMember
  const { isComplete, missingFields } = validateFamilyMemberProfile(member)

  if (!isComplete) {
    return { isComplete: false, missingFields }
  }

  const profileData: BookingProfileData = {
    firstName: member.first_name,
    lastName: member.last_name,
    email: member.email!,
    mobile: member.mobile!,
    dob: member.date_of_birth!,
    address: {
      line1: member.address_line1!,
      line2: member.address_line2 ?? null,
      city: member.city!,
      state: member.state!,
      postcode: member.postcode!,
      country: member.country ?? 'Australia',
    },
  }

  return { isComplete: true, missingFields: [], profileData }
}

export function useConditionalFamilySelector(userId: string | null) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!userId) { setFamilyMembers([]); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('family_members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      const all: FamilyMember[] = data ?? []
      const complete = all.filter((m) => validateFamilyMemberProfile(m).isComplete)
      setFamilyMembers(complete)
    } catch {
      setFamilyMembers([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { refetch() }, [refetch])

  return { familyMembers, hasFamilyMembers: familyMembers.length > 0, loading, refetch }
}
