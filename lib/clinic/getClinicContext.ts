import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPharmacyFeatureFlags } from '@/lib/utils/specializations'
import type { PharmacyFeatureFlags } from '@/lib/utils/specializations'
import type { ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ALL_PERMISSIONS, normalizePermissions } from '@/lib/clinic/staffTypes'

export interface ClinicContext {
  userId: string
  userEmail: string
  clinicId: string | null
  staffRole: string | null
  staffPermissions: ClinicPermissions | null
  hasClinic: boolean
  onboardingCompleted: boolean
}

export interface ClinicPortalData extends ClinicContext {
  clinicName: string
  clinicType: string | null
  subType: string | null
  isOwner: boolean
  featureFlags: PharmacyFeatureFlags
  centaurEnabled: boolean
  centaurPracticeId: string
  emergencySlotsEnabled: boolean
  bulkImportEnabled: boolean
}

/**
 * Fetch the clinic context for the current authenticated user.
 * React cache() deduplicates calls within a single request, so both
 * layout.tsx and page.tsx can call this without hitting the DB twice.
 */
export const getClinicContext = cache(async (): Promise<ClinicContext | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let clinicId: string | null = null
  let staffRole: string | null = null
  let hasClinic = false
  let onboardingCompleted = false

  let staffPermissions: ClinicPermissions | null = null

  // 1. Staff membership takes priority
  const { data: staffMembership } = await supabase
    .from('clinic_users')
    .select('clinic_id, role, permissions')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (staffMembership) {
    clinicId = staffMembership.clinic_id
    staffRole = staffMembership.role
    staffPermissions = normalizePermissions(staffMembership.permissions as unknown as Partial<ClinicPermissions>)
    hasClinic = true
    onboardingCompleted = true
  } else {
    // 2. Clinic owner
    const { data: ownerClinic } = await supabase
      .from('clinics')
      .select('id, onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (ownerClinic) {
      clinicId = ownerClinic.id
      hasClinic = true
      onboardingCompleted = !!ownerClinic.onboarding_completed_at
    }
  }

  return {
    userId: user.id,
    userEmail: user.email ?? '',
    clinicId,
    staffRole,
    staffPermissions,
    hasClinic,
    onboardingCompleted,
  }
})

/**
 * Fetch full portal data including clinic details and feature flags.
 * Calls getClinicContext() (cached) then fetches clinic row for flags.
 */
export const getClinicPortalData = cache(async (): Promise<ClinicPortalData | null> => {
  const ctx = await getClinicContext()
  if (!ctx) return null

  if (!ctx.clinicId) {
    return {
      ...ctx,
      clinicName: '',
      clinicType: null,
      subType: null,
      isOwner: true,
      featureFlags: getPharmacyFeatureFlags(null),
      centaurEnabled: false,
      centaurPracticeId: '',
      emergencySlotsEnabled: false,
      bulkImportEnabled: false,
    }
  }

  const supabase = await createClient()

  // Fetch from clinics table (not view) to get all columns including sub_type, specialization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clinic } = await (supabase as any)
    .from('clinics')
    .select('name, clinic_type, sub_type, specialization, chat_enabled, centaur_api_enabled, centaur_practice_id, emergency_slots_enabled, bulk_import_enabled')
    .eq('id', ctx.clinicId)
    .single() as { data: Record<string, unknown> | null }

  // Determine ownership and permissions
  const { data: permData } = await supabase
    .from('clinic_users')
    .select('role, permissions')
    .eq('clinic_id', ctx.clinicId)
    .eq('user_id', ctx.userId)
    .eq('is_active', true)
    .maybeSingle()

  const isOwner = !permData || permData.role === 'owner' || !ctx.staffRole

  // Resolve staff permissions — owner always gets ALL_PERMISSIONS
  const resolvedPermissions = isOwner
    ? ALL_PERMISSIONS
    : normalizePermissions(permData?.permissions as unknown as Partial<ClinicPermissions>)

  const clinicLike = {
    clinic_type: (clinic?.clinic_type as string) ?? null,
    sub_type: (clinic?.sub_type as string) ?? null,
    specialization: (clinic?.specialization as string) ?? null,
    chat_enabled: (clinic?.chat_enabled as boolean | null) ?? null,
  }

  return {
    ...ctx,
    staffPermissions: resolvedPermissions,
    clinicName: (clinic?.name as string) ?? '',
    clinicType: clinicLike.clinic_type,
    subType: clinicLike.sub_type,
    isOwner,
    featureFlags: getPharmacyFeatureFlags(clinicLike),
    centaurEnabled: !!(clinic?.centaur_api_enabled),
    centaurPracticeId: (clinic?.centaur_practice_id as string) ?? '',
    emergencySlotsEnabled: !!(clinic?.emergency_slots_enabled),
    bulkImportEnabled: !!(clinic?.bulk_import_enabled),
  }
})
