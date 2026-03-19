'use client'

import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface PharmacyOption {
  id: string
  name: string
  zip_code: string | null
  city: string | null
  address_line1: string | null
  phone: string | null
  logo_url: string | null
  isInPostcode: boolean
}

export function usePrescriptionSharing() {
  async function getPharmaciesForSharing(userPostcode?: string | null): Promise<PharmacyOption[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, zip_code, city, address_line1, phone, logo_url')
        .eq('is_active', true)
        .eq('sub_type', 'pharmacy')
        .order('name')

      if (error) return []

      const pharmacies: PharmacyOption[] = (data ?? []).map((c: Record<string, unknown>) => ({
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
      return []
    }
  }

  async function sharePrescriptionToPharmacy(
    prescriptionId: string,
    pharmacyClinicId: string,
    notes?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase.functions.invoke('share-prescription-to-pharmacy', {
        body: { prescriptionId, pharmacyClinicId, notes },
      })
      if (error) throw error
      if (data?.success === false) throw new Error(data.message ?? 'Share failed')
      toast({ title: 'Prescription Shared' })
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not share prescription.'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return { success: false, message }
    }
  }

  return { getPharmaciesForSharing, sharePrescriptionToPharmacy }
}
