'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { CheckCircle, Loader2 } from 'lucide-react'

interface Props {
  bookingId: string
  patientName: string
  serviceName: string
  markedBy: string // userId
  onSuccess: () => void
}

export default function AttendanceButton({ bookingId, patientName, serviceName, markedBy, onSuccess }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function markAttended() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'completed',
          attendance_status: 'attended',
          attendance_marked_at: new Date().toISOString(),
          attendance_marked_by: markedBy,
        })
        .eq('id', bookingId)

      if (error) throw error
      toast.success('Attendance marked — loyalty points awarded to patient')
      setOpen(false)
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
        className="border-blue-300 text-blue-700 hover:bg-blue-50"
        onClick={() => setOpen(true)}
      >
        <CheckCircle className="w-4 h-4 mr-1.5" />
        Mark Attended
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
            <DialogDescription>
              Mark <strong>{patientName}</strong> as attended
              {serviceName ? ` for ${serviceName}` : ''}?
              <br />
              Loyalty points will be awarded automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={markAttended} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
