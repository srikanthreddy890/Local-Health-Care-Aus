'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

const PAGE_SIZE = 20

export interface AdminAppointment {
  id: string
  source: 'standard' | 'centaur' | 'custom_api'
  patientName: string
  clinicId: string | null
  doctorName: string | null
  serviceName: string | null
  appointmentDate: string | null
  startTime: string | null
  status: string | null
  bookingReference: string | null
}

export interface AppointmentSummary {
  total: number
  upcoming: number
  completed: number
  cancelled: number
}

export function useAdminAppointments(userId: string) {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState<AppointmentSummary>({ total: 0, upcoming: 0, completed: 0, cancelled: 0 })

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      if (!isAdmin) throw new Error('Unauthorized: Admin access required')

      const today = new Date().toISOString().split('T')[0]

      // Fetch summary counts
      const [totalStd, totalCen, totalCus] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }),
      ])

      const [upcomingStd, upcomingCen, upcomingCus] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('appointment_date', today),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }).eq('booking_status', 'confirmed').gte('appointment_date', today),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }).eq('booking_status', 'confirmed').gte('appointment_date', today),
      ])

      const [completedStd, completedCen, completedCus] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }).eq('booking_status', 'completed'),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }).eq('booking_status', 'completed'),
      ])

      const [cancelledStd, cancelledCen, cancelledCus] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).in('status', ['cancelled', 'no_show']),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }).in('booking_status', ['cancelled', 'no_show']),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }).in('booking_status', ['cancelled', 'no_show']),
      ])

      setSummary({
        total: (totalStd.count ?? 0) + (totalCen.count ?? 0) + (totalCus.count ?? 0),
        upcoming: (upcomingStd.count ?? 0) + (upcomingCen.count ?? 0) + (upcomingCus.count ?? 0),
        completed: (completedStd.count ?? 0) + (completedCen.count ?? 0) + (completedCus.count ?? 0),
        cancelled: (cancelledStd.count ?? 0) + (cancelledCen.count ?? 0) + (cancelledCus.count ?? 0),
      })

      // Build standard bookings query
      let stdQuery = supabase
        .from('bookings')
        .select('id, patient_first_name, patient_last_name, clinic_id, doctor_name, service_name, appointment_date, start_time, status, booking_reference')
        .order('appointment_date', { ascending: false })
        .limit(500)

      if (statusFilter !== 'all') stdQuery = stdQuery.eq('status', statusFilter)
      if (dateFilter === 'today') stdQuery = stdQuery.eq('appointment_date', today)
      else if (dateFilter === 'upcoming') stdQuery = stdQuery.gte('appointment_date', today)
      else if (dateFilter === 'past') stdQuery = stdQuery.lt('appointment_date', today)

      let cenQuery = supabase
        .from('centaur_bookings')
        .select('id, patient_first_name, patient_last_name, clinic_id, appointment_date, appointment_time, booking_status, service_performed')
        .order('appointment_date', { ascending: false })
        .limit(500)

      if (statusFilter !== 'all') cenQuery = cenQuery.eq('booking_status', statusFilter)
      if (dateFilter === 'today') cenQuery = cenQuery.eq('appointment_date', today)
      else if (dateFilter === 'upcoming') cenQuery = cenQuery.gte('appointment_date', today)
      else if (dateFilter === 'past') cenQuery = cenQuery.lt('appointment_date', today)

      let cusQuery = supabase
        .from('custom_api_bookings')
        .select('id, patient_first_name, patient_last_name, clinic_id, doctor_name, service_name, appointment_date, appointment_time, booking_status, external_booking_id')
        .order('appointment_date', { ascending: false })
        .limit(500)

      if (statusFilter !== 'all') cusQuery = cusQuery.eq('booking_status', statusFilter)
      if (dateFilter === 'today') cusQuery = cusQuery.eq('appointment_date', today)
      else if (dateFilter === 'upcoming') cusQuery = cusQuery.gte('appointment_date', today)
      else if (dateFilter === 'past') cusQuery = cusQuery.lt('appointment_date', today)

      const [std, cen, cus] = await Promise.all([stdQuery, cenQuery, cusQuery])

      const all: AdminAppointment[] = []

      for (const b of std.data ?? []) {
        all.push({
          id: b.id,
          source: 'standard',
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          clinicId: b.clinic_id,
          doctorName: b.doctor_name,
          serviceName: b.service_name,
          appointmentDate: b.appointment_date,
          startTime: b.start_time,
          status: b.status,
          bookingReference: b.booking_reference,
        })
      }

      for (const b of cen.data ?? []) {
        all.push({
          id: b.id,
          source: 'centaur',
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          clinicId: b.clinic_id,
          doctorName: null,
          serviceName: b.service_performed,
          appointmentDate: b.appointment_date,
          startTime: b.appointment_time,
          status: b.booking_status,
          bookingReference: null,
        })
      }

      for (const b of cus.data ?? []) {
        all.push({
          id: b.id,
          source: 'custom_api',
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          clinicId: b.clinic_id,
          doctorName: b.doctor_name,
          serviceName: b.service_name,
          appointmentDate: b.appointment_date,
          startTime: b.appointment_time,
          status: b.booking_status,
          bookingReference: b.external_booking_id,
        })
      }

      // Sort by date descending
      all.sort((a, b) => (b.appointmentDate ?? '').localeCompare(a.appointmentDate ?? ''))

      // Client-side search filter
      let filtered = all
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        filtered = all.filter(
          (a) =>
            a.patientName.toLowerCase().includes(q) ||
            a.doctorName?.toLowerCase().includes(q) ||
            a.bookingReference?.toLowerCase().includes(q),
        )
      }

      setTotalCount(filtered.length)
      const from = page * PAGE_SIZE
      setAppointments(filtered.slice(from, from + PAGE_SIZE))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }, [userId, search, statusFilter, dateFilter, page])

  useEffect(() => {
    if (userId) fetchAppointments()
  }, [fetchAppointments, userId])

  useEffect(() => {
    setPage(0)
  }, [search, statusFilter, dateFilter])

  return {
    appointments,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    page,
    setPage,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    summary,
    refetch: fetchAppointments,
  }
}
