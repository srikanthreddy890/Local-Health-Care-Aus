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
  bookingId: string       // custom_api_bookings.id
  clinicId: string
  patientId?: string      // patient's user id for loyalty points
  patientName: string
  markedBy: string        // userId
  onSuccess: () => void
}

export default function CustomApiAttendanceButton({ bookingId, clinicId, patientId, patientName, markedBy, onSuccess }: Props) {
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
      const pointsToAward = selectedService?.default_points ?? 0

      const { error } = await supabase
        .from('custom_api_bookings')
        .update({
          attendance_status: 'attended',
          attendance_marked_at: new Date().toISOString(),
          attendance_marked_by: markedBy,
          service_performed: selectedService?.name ?? '',
          points_awarded: pointsToAward > 0,
          service_points: pointsToAward,
          points_awarded_at: pointsToAward > 0 ? new Date().toISOString() : null,
        })
        .eq('id', bookingId)

      if (error) throw error

      // Award loyalty points to patient if applicable
      if (patientId && pointsToAward > 0) {
        try {
          await supabase.rpc('award_loyalty_points', {
            p_user_id: patientId,
            p_points: pointsToAward,
            p_booking_id: bookingId,
            p_clinic_id: clinicId,
            p_description: `Attendance: ${selectedService?.name ?? 'service'}`,
          })
        } catch (loyaltyErr) {
          console.warn('[CustomApiAttendanceButton] Failed to award loyalty points:', loyaltyErr)
          // Don't fail the attendance marking if loyalty fails
        }
      }

      const pointsMsg = pointsToAward > 0 ? ` ${pointsToAward} loyalty points awarded.` : ''
      toast.success(`Attendance marked!${pointsMsg}`)
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
        className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
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
