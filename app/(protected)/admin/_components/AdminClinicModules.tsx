'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { MODULE_LABELS } from '@/lib/hooks/useClinicBilling'
import type { ClinicWithBilling } from '@/lib/hooks/useAdminClinics'

const MODULE_PRICE = 19.99

const MODULE_KEYS = [
  'bulk_import',
  'quotes',
  'emergency_slots',
  'chat',
  'referrals',
  'patient_documents',
] as const

interface Props {
  clinic: ClinicWithBilling | null
  open: boolean
  onClose: () => void
}

export default function AdminClinicModules({ clinic, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [modules, setModules] = useState<Record<string, boolean>>({})

  // Initialize from clinic module flags
  useEffect(() => {
    if (clinic) {
      setModules({
        bulk_import: clinic.bulk_import_enabled ?? false,
        quotes: clinic.quotes_enabled ?? false,
        emergency_slots: clinic.emergency_slots_enabled ?? false,
        chat: clinic.chat_enabled ?? false,
        referrals: clinic.referrals_enabled ?? false,
        patient_documents: clinic.patient_documents_enabled ?? false,
      })
    }
  }, [clinic])

  const enabledCount = Object.values(modules).filter(Boolean).length
  const monthlyTotal = enabledCount * MODULE_PRICE

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clinic) return
      const supabase = createClient()
      const { error } = await supabase.rpc('admin_update_clinic_modules', {
        p_clinic_id: clinic.id,
        p_bulk_import_enabled: modules.bulk_import ?? false,
        p_quotes_enabled: modules.quotes ?? false,
        p_emergency_slots_enabled: modules.emergency_slots ?? false,
        p_chat_enabled: modules.chat ?? false,
        p_referrals_enabled: modules.referrals ?? false,
        p_patient_documents_enabled: modules.patient_documents ?? false,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Modules updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['clinic-module-subscriptions', clinic?.id] })
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update modules')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Modules — {clinic?.name}</DialogTitle>
          <DialogDescription>
            Toggle platform modules for this clinic. Each module costs ${MODULE_PRICE}/month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {MODULE_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <Label className="font-medium">{MODULE_LABELS[key] ?? key}</Label>
                <p className="text-xs text-lhc-text-muted">${MODULE_PRICE}/month</p>
              </div>
              <Switch
                checked={modules[key] ?? false}
                onCheckedChange={(checked) =>
                  setModules((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="text-sm text-lhc-text-muted flex-1">
            {enabledCount} module{enabledCount !== 1 ? 's' : ''} enabled · ${monthlyTotal.toFixed(2)}/month
          </div>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
