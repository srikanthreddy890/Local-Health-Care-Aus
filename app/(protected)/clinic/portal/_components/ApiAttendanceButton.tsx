'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface Props {
  bookingId: string       // centaur_bookings.id
  clinicId: string
  patientName: string
  markedBy: string        // userId
  onSuccess: () => void
}

export default function ApiAttendanceButton({ bookingId, clinicId, patientName, markedBy, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const { data: services } = useQuery({
    queryKey: ['clinic-services', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('services')
        .select('id, name, default_points')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name')
      return (data ?? []) as { id: string; name: string; default_points: number | null }[]
    },
    enabled: open,
  })

  const selectedService = services?.find((s) => s.id === selectedServiceId)

  async function markAttended() {
    if (!selectedServiceId) {
      toast.error('Please select a service first.')
      return
    }
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('centaur_bookings')
        .update({
          attendance_status: 'attended',
          attendance_marked_at: new Date().toISOString(),
          attendance_marked_by: markedBy,
          service_performed: selectedService?.name ?? '',
        })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Attendance marked — loyalty points awarded to patient')
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['clinic-bookings-unified', clinicId] })
      onSuccess()
    } catch {
      toast.error('Failed to mark attendance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-purple-300 text-purple-700 hover:bg-purple-50"
        onClick={() => setOpen(true)}
      >
        <CheckCircle className="w-4 h-4 mr-1.5" />
        Mark Attended
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance — {patientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Select service performed</Label>
            <select
              className="w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              <option value="">— choose a service —</option>
              {(services ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.default_points ? ` (${s.default_points} pts)` : ''}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={markAttended}
              disabled={loading || !selectedServiceId}
            >
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
