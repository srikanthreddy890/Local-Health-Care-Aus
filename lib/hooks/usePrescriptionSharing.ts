'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import type { PharmacyOption } from '@/lib/prescriptions/types'

// Re-export shared types for consumers
export type { PharmacyOption }

export function usePrescriptionSharing() {
  async function getPharmaciesForSharing(userPostcode?: string | null): Promise<PharmacyOption[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, zip_code, city, address_line1, phone, logo_url')
        .eq('is_active', true)
        .eq('sub_type', 'pharmacy')
        .order('name')

      if (error) {
        toast.error('Could not load pharmacies.')
        return []
      }

      const pharmacies: PharmacyOption[] = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        zip_code: c.zip_code ?? null,
        city: c.city ?? null,
        address_line1: c.address_line1 ?? null,
        phone: c.phone ?? null,
        logo_url: c.logo_url ?? null,
        isInPostcode: !!userPostcode && c.zip_code === userPostcode,
      }))

      // Sort: local pharmacies first, then alphabetical
      return pharmacies.sort((a, b) => {
        if (a.isInPostcode && !b.isInPostcode) return -1
        if (!a.isInPostcode && b.isInPostcode) return 1
        return a.name.localeCompare(b.name)
      })
    } catch {
      toast.error('Could not load pharmacies.')
      return []
    }
  }

  async function sharePrescriptionToPharmacy(
    prescriptionId: string,
    pharmacyClinicId: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('share-prescription-to-pharmacy', {
        body: { prescriptionId, pharmacyClinicId, notes },
      })
      if (error) throw error
      if (data?.success === false) throw new Error(data.message ?? 'Share failed')
      toast.success('Prescription shared successfully.')
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not share prescription.'
      toast.error(message)
      return { success: false, message }
    }
  }

  return { getPharmaciesForSharing, sharePrescriptionToPharmacy }
}
