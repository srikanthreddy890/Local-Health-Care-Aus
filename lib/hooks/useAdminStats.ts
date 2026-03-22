'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface AdminStats {
  totalClinics: number
  activeClinics: number
  totalDoctors: number
  totalBookings: number
  totalPatients: number
  clinicsWithBilling: number
  pendingClaims: number
  pendingBlog: number
}

async function verifyAdmin(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
  if (!data) throw new Error('Unauthorized: Admin access required')
}

export function useAdminStats(userId: string) {
  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const supabase = createClient()
      await verifyAdmin(supabase, userId)

      const [
        clinicsRes,
        activeClinicsRes,
        doctorsRes,
        bookingsRes,
        centaurRes,
        customRes,
        patientsRes,
        billingRes,
        claimsRes,
        blogRes,
      ] = await Promise.all([
        supabase.from('clinics').select('id', { count: 'exact', head: true }),
        supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'patient'),
        supabase.from('clinic_billing').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase
          .from('clinic_profile_claims')
          .select('id', { count: 'exact', head: true })
          .in('claim_status', ['pending', 'verified_pending_approval']),
        supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft')
          .not('clinic_id', 'is', null),
      ])

      return {
        totalClinics: clinicsRes.count ?? 0,
        activeClinics: activeClinicsRes.count ?? 0,
        totalDoctors: doctorsRes.count ?? 0,
        totalBookings: (bookingsRes.count ?? 0) + (centaurRes.count ?? 0) + (customRes.count ?? 0),
        totalPatients: patientsRes.count ?? 0,
        clinicsWithBilling: billingRes.count ?? 0,
        pendingClaims: claimsRes.count ?? 0,
        pendingBlog: blogRes.count ?? 0,
      }
    },
    enabled: !!userId,
    refetchInterval: 30000,
  })
}

/** Lightweight hook just for badge counts in the shell */
export function useAdminBadgeCounts(userId: string) {
  const { data } = useQuery({
    queryKey: ['admin-badge-counts'],
    queryFn: async () => {
      const supabase = createClient()
      await verifyAdmin(supabase, userId)

      const [claimsRes, blogRes] = await Promise.all([
        supabase
          .from('clinic_profile_claims')
          .select('id', { count: 'exact', head: true })
          .in('claim_status', ['pending', 'verified_pending_approval']),
        supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'draft')
          .not('clinic_id', 'is', null),
      ])
      return {
        pendingClaims: claimsRes.count ?? 0,
        pendingBlog: blogRes.count ?? 0,
      }
    },
    enabled: !!userId,
    refetchInterval: 30000,
  })

  return {
    pendingClaims: data?.pendingClaims ?? 0,
    pendingBlog: data?.pendingBlog ?? 0,
  }
}
