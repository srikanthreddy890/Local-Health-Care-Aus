'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffRole, ClinicPermissions } from '@/lib/clinic/staffTypes'
import { ALL_PERMISSIONS } from '@/lib/clinic/staffTypes'

interface ClinicPermissionsData {
  role: StaffRole | null
  permissions: ClinicPermissions | null
  isOwner: boolean
  isManager: boolean
  canManageStaff: boolean
  loading: boolean
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
        const p = (staffRecord.permissions as unknown as ClinicPermissions) ?? ALL_PERMISSIONS
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

  return { role, permissions, isOwner, isManager, canManageStaff, loading }
}
