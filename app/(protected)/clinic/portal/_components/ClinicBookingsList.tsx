'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, CalendarDays, AlertCircle } from 'lucide-react'

interface Props {
  clinicId: string
  selectedDoctorId?: string | null
  selectedDate?: string | null
}

export default function ClinicBookingsList({ clinicId, selectedDoctorId, selectedDate }: Props) {
  const [search, setSearch] = useState('')

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['clinic-bookings-list', clinicId, selectedDoctorId, selectedDate],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      let query = supabase
        .from('bookings')
        .select('id, status, booking_date, booking_time, profiles!patient_id(first_name, last_name, phone), doctors(name), services(name)')
        .eq('clinic_id', clinicId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: true })
        .limit(50)

      if (selectedDoctorId) query = query.eq('doctor_id', selectedDoctorId)
      if (selectedDate) query = query.eq('booking_date', selectedDate)

      const { data, error: queryError } = await query
      if (queryError) throw new Error(queryError.message)
      return data ?? []
    },
    enabled: !!clinicId,
  })

  const filtered = ((bookings ?? []) as Record<string, unknown>[]).filter((b: Record<string, unknown>) => {
    if (!search) return true
    const profile = b.profiles as { first_name?: string; last_name?: string } | null
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lhc-text-main flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-lhc-primary" />
          Booked Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            className="pl-9"
            placeholder="Search by patient name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 py-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load bookings. Please refresh and try again.</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-lhc-text-muted text-sm text-center py-6">No bookings found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((b: Record<string, unknown>) => {
              const profile = b.profiles as { first_name?: string; last_name?: string; phone?: string } | null
              const doctor = b.doctors as { name?: string } | null
              const service = b.services as { name?: string } | null
              const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown'
              const status = b.status as string

              return (
                <div key={b.id as string} className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-lhc-text-main">{name}</p>
                    <p className="text-xs text-lhc-text-muted">
                      {b.booking_date as string} · {b.booking_time as string}
                      {doctor?.name ? ` · Dr ${doctor.name}` : ''}
                      {service?.name ? ` · ${service.name}` : ''}
                    </p>
                  </div>
                  <Badge
                    variant={
                      status === 'confirmed' ? 'success' :
                      status === 'pending' ? 'warning' :
                      status === 'cancelled' ? 'destructive' : 'secondary'
                    }
                  >
                    {status}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
