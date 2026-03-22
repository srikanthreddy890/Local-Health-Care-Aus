'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffRole, ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ALL_PERMISSIONS, normalizePermissions } from '@/lib/clinic/staffTypes'

interface ClinicPermissionsData {
  role: StaffRole | null
  permissions: ClinicPermissions | null
  isOwner: boolean
  isManager: boolean
  canManageStaff: boolean
  loading: boolean
  // Individual permission accessors
  canManageDoctors: boolean
  canManageAppointments: boolean
  canManageBookings: boolean
  canViewReports: boolean
  canManageSettings: boolean
  canManageLoyalty: boolean
  canViewPatients: boolean
  canViewChat: boolean
  canSendMessages: boolean
  canManagePrescriptions: boolean
  canManageDocuments: boolean
  canManageReferrals: boolean
  canManageQuotes: boolean
  canManageBilling: boolean
  canManageBlog: boolean
  hasPermission: (key: keyof ClinicPermissions) => boolean
}

export function useClinicPermissions(clinicId: string): ClinicPermissionsData {
  const [role, setRole] = useState<StaffRole | null>(null)
  const [permissions, setPermissions] = useState<ClinicPermissions | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchPermissions() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) {
        setLoading(false)
        return
      }

      // Fetch clinic owner and staff record in parallel
      const [clinicResult, staffResult] = await Promise.all([
        supabase.from('clinics').select('user_id').eq('id', clinicId).single(),
        supabase.from('clinic_users').select('role, permissions')
          .eq('clinic_id', clinicId).eq('user_id', user.id).eq('is_active', true).maybeSingle(),
      ])

      const clinic = clinicResult.data
      const staffRecord = staffResult.data
      const ownerMatch = clinic?.user_id === user.id

      if (cancelled) return

      if (staffRecord) {
        const r = staffRecord.role as StaffRole
        const p = normalizePermissions(staffRecord.permissions as unknown as Partial<ClinicPermissions>)
        setRole(r)
        setPermissions(p)
        setIsOwner(r === 'owner' || ownerMatch)
      } else if (ownerMatch) {
        // Synthetic owner — no clinic_users row
        setRole('owner')
        setPermissions(ALL_PERMISSIONS)
        setIsOwner(true)
      } else {
        setRole(null)
        setPermissions(null)
        setIsOwner(false)
      }

      setLoading(false)
    }

    fetchPermissions()
    return () => { cancelled = true }
  }, [clinicId])

  const isManager = role === 'manager'
  const canManageStaff = isOwner || isManager

  // Resolve permissions — owner always gets ALL_PERMISSIONS
  const resolved = isOwner ? ALL_PERMISSIONS : (permissions ?? normalizePermissions(null))

  const hasPermission = useCallback(
    (key: keyof ClinicPermissions) => isOwner || (resolved[key] ?? false),
    [isOwner, resolved]
  )

  return {
    role,
    permissions,
    isOwner,
    isManager,
    canManageStaff,
    loading,
    canManageDoctors: resolved.can_manage_doctors,
    canManageAppointments: resolved.can_manage_appointments,
    canManageBookings: resolved.can_manage_bookings,
    canViewReports: resolved.can_view_reports,
    canManageSettings: resolved.can_manage_settings,
    canManageLoyalty: resolved.can_manage_loyalty,
    canViewPatients: resolved.can_view_patients,
    canViewChat: resolved.can_view_chat,
    canSendMessages: resolved.can_send_messages,
    canManagePrescriptions: resolved.can_manage_prescriptions,
    canManageDocuments: resolved.can_manage_documents,
    canManageReferrals: resolved.can_manage_referrals,
    canManageQuotes: resolved.can_manage_quotes,
    canManageBilling: resolved.can_manage_billing,
    canManageBlog: resolved.can_manage_blog,
    hasPermission,
  }
}
