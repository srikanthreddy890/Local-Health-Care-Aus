'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface ClaimWithClinic {
  id: string
  claim_status: string
  email: string | null
  claim_notes: string | null
  document_urls: unknown
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  clinic_id: string | null
  // Joined apify_clinics fields
  clinic_name: string | null
  clinic_address: string | null
  clinic_phone: string | null
  clinic_image: string | null
}

export function useAdminClaims(userId: string) {
  const queryClient = useQueryClient()

  const claimsQuery = useQuery<ClaimWithClinic[]>({
    queryKey: ['admin-claims'],
    queryFn: async () => {
      const supabase = createClient()

      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      if (!isAdmin) throw new Error('Unauthorized: Admin access required')

      const { data, error } = await supabase
        .from('clinic_profile_claims')
        .select('id, claim_status, email, claim_notes, document_urls, submitted_at, approved_at, rejected_at, rejection_reason, clinic_id')
        .order('submitted_at', { ascending: false })

      if (error) throw error

      // Fetch clinic info from apify_clinics for each claim
      const clinicIds = [...new Set((data ?? []).map((c) => c.clinic_id).filter(Boolean))] as string[]
      let clinicMap: Record<string, { name: string; address: string | null; phone: string | null; image_url: string | null }> = {}

      if (clinicIds.length > 0) {
        const { data: clinics } = await supabase
          .from('apify_clinics')
          .select('id, name, address, phone, image_url')
          .in('id', clinicIds)

        for (const c of clinics ?? []) {
          clinicMap[c.id] = { name: c.name, address: c.address, phone: c.phone, image_url: c.image_url }
        }
      }

      return (data ?? []).map((claim) => ({
        ...claim,
        clinic_name: claim.clinic_id ? clinicMap[claim.clinic_id]?.name ?? null : null,
        clinic_address: claim.clinic_id ? clinicMap[claim.clinic_id]?.address ?? null : null,
        clinic_phone: claim.clinic_id ? clinicMap[claim.clinic_id]?.phone ?? null : null,
        clinic_image: claim.clinic_id ? clinicMap[claim.clinic_id]?.image_url ?? null : null,
      }))
    },
    enabled: !!userId,
  })

  const pendingCount = (claimsQuery.data ?? []).filter(
    (c) => c.claim_status === 'pending' || c.claim_status === 'verified_pending_approval',
  ).length

  const approveMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('admin-approve-claim', {
        body: { claim_id: claimId, action: 'approve' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Claim approved successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-badge-counts'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to approve claim')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ claimId, reason }: { claimId: string; reason: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('admin-approve-claim', {
        body: { claim_id: claimId, action: 'reject', admin_notes: reason },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Claim rejected')
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-badge-counts'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reject claim')
    },
  })

  return {
    claims: claimsQuery.data ?? [],
    pendingCount,
    isLoading: claimsQuery.isLoading,
    error: claimsQuery.error,
    refetch: claimsQuery.refetch,
    approveClaim: approveMutation.mutate,
    rejectClaim: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  }
}
