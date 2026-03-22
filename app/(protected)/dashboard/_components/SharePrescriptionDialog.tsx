'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader2, Search, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePrescriptionSharing } from '@/lib/hooks/usePrescriptionSharing'
import type { PharmacyOption } from '@/lib/prescriptions/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescriptionId: string
  patientId: string
  onSuccess: () => void
}

export default function SharePrescriptionDialog({
  open, onOpenChange, prescriptionId, patientId, onSuccess,
}: Props) {
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([])
  const [sharedPharmacyIds, setSharedPharmacyIds] = useState<Set<string>>(new Set())
  const [loadingPharmacies, setLoadingPharmacies] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyOption | null>(null)
  const [notes, setNotes] = useState('')
  const [sharing, setSharing] = useState(false)

  const { getPharmaciesForSharing, sharePrescriptionToPharmacy } = usePrescriptionSharing()

  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedPharmacy(null)
      setNotes('')
      setPharmacies([])
      setSharedPharmacyIds(new Set())
      return
    }

    async function load() {
      setLoadingPharmacies(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('postcode')
          .eq('id', patientId)
          .single()
        const postcode: string | null = data?.postcode ?? null

        // Fetch pharmacies and existing shares for this prescription in parallel
        const [results, shareData] = await Promise.all([
          getPharmaciesForSharing(postcode),
          supabase
            .from('prescription_pharmacy_shares')
            .select('pharmacy_clinic_id')
            .eq('prescription_id', prescriptionId)
            .eq('access_revoked', false),
        ])

        setSharedPharmacyIds(
          new Set((shareData.data ?? []).map((s) => s.pharmacy_clinic_id))
        )
        setPharmacies(results)
      } finally {
        setLoadingPharmacies(false)
      }
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patientId, prescriptionId])

  const filtered = pharmacies.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.city ?? '').toLowerCase().includes(q) ||
      (p.zip_code ?? '').toLowerCase().includes(q) ||
      (p.address_line1 ?? '').toLowerCase().includes(q)
    )
  })

  async function handleShare() {
    if (!selectedPharmacy) return
    setSharing(true)
    try {
      const result = await sharePrescriptionToPharmacy(prescriptionId, selectedPharmacy.id, notes || undefined)
      if (result.success) {
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share with Pharmacy</DialogTitle>
          <DialogDescription>
            Select a pharmacy to send this prescription to. They will be notified and can view it via their portal.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, city, postcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1">
          {loadingPharmacies ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Store className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {pharmacies.length === 0 ? 'No pharmacies available' : 'No pharmacies match your search'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
                {pharmacies.length === 0
                  ? 'There are no registered pharmacies on the platform yet.'
                  : 'Try a different name, city, or postcode.'}
              </p>
            </div>
          ) : (
            filtered.map((pharmacy) => {
              const isAlreadyShared = sharedPharmacyIds.has(pharmacy.id)
              const isSelected = selectedPharmacy?.id === pharmacy.id
              return (
                <button
                  key={pharmacy.id}
                  type="button"
                  disabled={isAlreadyShared}
                  onClick={() => setSelectedPharmacy(isSelected ? null : pharmacy)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    isAlreadyShared
                      ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{pharmacy.name}</span>
                        {pharmacy.isInPostcode && (
                          <Badge variant="secondary" className="text-xs shrink-0">Your area</Badge>
                        )}
                        {isAlreadyShared && (
                          <Badge variant="outline" className="text-xs shrink-0">Already shared</Badge>
                        )}
                      </div>
                      {(pharmacy.city || pharmacy.address_line1) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {[pharmacy.address_line1, pharmacy.city].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectedPharmacy && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message to pharmacy (optional)</label>
            <Textarea
              placeholder="Add any notes for the pharmacy…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sharing}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={!selectedPharmacy || sharing}>
            {sharing ? <><Loader2 className="w-4 h-4 animate-spin" />Sharing…</> : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
