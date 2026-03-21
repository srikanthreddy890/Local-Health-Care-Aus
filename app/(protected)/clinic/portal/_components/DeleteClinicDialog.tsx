'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'

interface Props {
  clinicId: string
  clinicName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DELETED_DATA = [
  'Clinic information & settings',
  'All doctors & their schedules',
  'Appointments (past, present, and future)',
  'Bookings & booking history',
  'Patient preferences & records',
  'Integration configurations',
  'Clinic documents & images',
  'Services & treatment plans',
  'Staff records & invitations',
  'Reviews & ratings',
  'Audit logs & history',
]

export default function DeleteClinicDialog({ clinicId, clinicName, open, onOpenChange }: Props) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = confirmText === clinicName

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase.functions.invoke('delete-clinic', {
        body: { clinicId },
      })
      if (error) throw error

      toast.success('Clinic deleted successfully.')
      await supabase.auth.signOut()
      router.replace('/')
    } catch {
      toast.error('Failed to delete clinic. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirmText('') }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Delete Clinic Permanently
          </DialogTitle>
          <DialogDescription>
            This action is <strong className="text-red-600">permanent</strong> and cannot be undone.
            All of the following data will be permanently deleted:
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 my-2">
          <ul className="text-xs text-red-700 space-y-1">
            {DELETED_DATA.map(item => (
              <li key={item} className="flex items-start gap-1.5">
                <span className="mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Type <strong className="font-semibold">{clinicName}</strong> to confirm:
            </Label>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={clinicName}
              disabled={deleting}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || deleting}>
              {deleting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Deleting…</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-1.5" />Delete Permanently</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
