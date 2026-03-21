'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type {
  StaffRole,
  ClinicPermissions,
  ClinicStaffMember,
  ClinicInvitation,
} from '@/lib/clinic/staffTypes'
import { ALL_PERMISSIONS } from '@/lib/clinic/staffTypes'

interface InviteParams {
  email: string
  firstName?: string
  lastName?: string
  role: StaffRole
  permissions: ClinicPermissions
}

interface UpdatePermissionsParams {
  userId: string
  role?: StaffRole
  permissions?: ClinicPermissions
}

export function useClinicStaff(clinicId: string) {
  const queryClient = useQueryClient()

  // ── Active staff ──────────────────────────────────────────────────────────
  const {
    data: staff = [],
    isLoading: staffLoading,
  } = useQuery<ClinicStaffMember[]>({
    queryKey: ['clinic-staff', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      // Get clinic owner id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinic } = await (supabase as any)
        .from('clinics')
        .select('user_id')
        .eq('id', clinicId)
        .single()

      // Fetch active staff from clinic_users joined with profiles
      const { data: rows, error } = await supabase
        .from('clinic_users')
        .select('id, user_id, clinic_id, role, permissions, is_active, invited_by, invited_at, accepted_at')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)

      if (error) throw error

      // Fetch profile info for each staff member (profiles table has no email column)
      const userIds = (rows ?? []).map((r) => r.user_id)
      let profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds)

        if (profiles) {
          profileMap = Object.fromEntries(
            profiles.map((p) => [p.id, { first_name: p.first_name, last_name: p.last_name }])
          )
        }
      }

      const members: ClinicStaffMember[] = (rows ?? []).map((r) => {
        const profile = profileMap[r.user_id]
        return {
          id: r.id,
          user_id: r.user_id,
          clinic_id: r.clinic_id,
          role: r.role as StaffRole,
          permissions: (r.permissions as unknown as ClinicPermissions) ?? ALL_PERMISSIONS,
          is_active: r.is_active,
          invited_by: r.invited_by,
          invited_at: r.invited_at,
          accepted_at: r.accepted_at,
          first_name: profile?.first_name ?? undefined,
          last_name: profile?.last_name ?? undefined,
        }
      })

      // Synthesize owner if not already in clinic_users
      if (clinic?.user_id && !members.some((m) => m.user_id === clinic.user_id)) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', clinic.user_id)
          .single()

        members.unshift({
          id: 'owner-synthetic',
          user_id: clinic.user_id,
          clinic_id: clinicId,
          role: 'owner',
          permissions: ALL_PERMISSIONS,
          is_active: true,
          invited_by: null,
          invited_at: null,
          accepted_at: null,
          first_name: ownerProfile?.first_name ?? undefined,
          last_name: ownerProfile?.last_name ?? undefined,
        })
      }

      return members
    },
    enabled: !!clinicId,
  })

  // ── Pending invitations ───────────────────────────────────────────────────
  const {
    data: invitations = [],
    isLoading: invitationsLoading,
  } = useQuery<ClinicInvitation[]>({
    queryKey: ['clinic-invitations', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clinic_invitations')
        .select('id, clinic_id, email, first_name, last_name, role, permissions, invited_by, accepted, expires_at, created_at')
        .eq('clinic_id', clinicId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => ({
        ...row,
        role: row.role as StaffRole,
        permissions: row.permissions as unknown as ClinicPermissions,
      }))
    },
    enabled: !!clinicId,
    refetchInterval: 60_000, // Re-check every minute to drop expired invitations
  })

  // ── Mutations via edge function ───────────────────────────────────────────
  const invokeAction = async (action: string, params: Record<string, unknown>) => {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('clinic-staff-management', {
      body: { action, clinic_id: clinicId, ...params },
    })
    if (error) throw new Error(error.message ?? 'Action failed')
    if (data?.error) throw new Error(data.error)
    return data
  }

  const inviteStaff = useMutation({
    mutationFn: (params: InviteParams) =>
      invokeAction('invite', {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        role: params.role,
        permissions: params.permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-invitations', clinicId] })
      toast.success('Invitation sent successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const resendInvitation = useMutation({
    mutationFn: (invitationId: string) =>
      invokeAction('resend', { invitation_id: invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-invitations', clinicId] })
      toast.success('Invitation resent')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const revokeInvitation = useMutation({
    mutationFn: (invitationId: string) =>
      invokeAction('revoke', { invitation_id: invitationId, type: 'invitation' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-invitations', clinicId] })
      toast.success('Invitation revoked')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deactivateStaff = useMutation({
    mutationFn: (userId: string) =>
      invokeAction('revoke', { user_id: userId, type: 'staff' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-staff', clinicId] })
      toast.success('Staff member deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updatePermissions = useMutation({
    mutationFn: (params: UpdatePermissionsParams) =>
      invokeAction('update-permissions', {
        user_id: params.userId,
        role: params.role,
        permissions: params.permissions,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-staff', clinicId] })
      toast.success('Permissions updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return {
    staff,
    invitations,
    staffLoading,
    invitationsLoading,
    inviteStaff,
    resendInvitation,
    revokeInvitation,
    deactivateStaff,
    updatePermissions,
  }
}
