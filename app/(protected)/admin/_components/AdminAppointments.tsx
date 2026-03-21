'use client'

import { Calendar, CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdminContext } from './AdminContext'
import { useAdminAppointments } from '@/lib/hooks/useAdminAppointments'

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-lhc-text-main">{value}</p>
            <p className="text-sm text-lhc-text-muted">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  pending: 'bg-amber-50 text-amber-700',
  completed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-gray-100 text-gray-700',
}

export default function AdminAppointments() {
  const { userId } = useAdminContext()
  const {
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
    totalPages,
    summary,
  } = useAdminAppointments(userId)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">All Appointments</h2>
        <p className="text-sm text-lhc-text-muted">Monitor bookings across all clinics and integrations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Bookings" value={summary.total} icon={Calendar} color="bg-lhc-primary/10 text-lhc-primary" />
        <SummaryCard title="Upcoming" value={summary.upcoming} icon={Clock} color="bg-blue-100 text-blue-600" />
        <SummaryCard title="Completed" value={summary.completed} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <SummaryCard title="Cancelled / No-show" value={summary.cancelled} icon={XCircle} color="bg-red-100 text-red-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            placeholder="Search patient, doctor, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <p className="text-center text-lhc-text-muted py-12">No appointments found.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-lhc-border text-left">
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Patient</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Doctor / Service</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Date & Time</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Status</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Source</th>
                  <th className="py-2 px-3 font-medium text-lhc-text-muted">Reference</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-lhc-border/50 hover:bg-lhc-surface/50">
                    <td className="py-2.5 px-3 text-lhc-text-main">{a.patientName}</td>
                    <td className="py-2.5 px-3 text-lhc-text-muted">
                      {a.doctorName ?? a.serviceName ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-lhc-text-muted">
                      {a.appointmentDate ?? '—'} {a.startTime && `at ${a.startTime}`}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={`text-xs capitalize ${statusColors[a.status ?? ''] ?? ''}`}>
                        {a.status ?? 'unknown'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {a.source}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-lhc-text-muted text-xs font-mono">
                      {a.bookingReference ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {appointments.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-lhc-text-main">{a.patientName}</p>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColors[a.status ?? ''] ?? ''}`}>
                      {a.status ?? 'unknown'}
                    </Badge>
                  </div>
                  <p className="text-xs text-lhc-text-muted mt-1">
                    {a.doctorName ?? a.serviceName ?? 'No service'} · {a.appointmentDate ?? 'No date'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-lhc-text-muted">{totalCount} total results</p>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-lhc-text-muted">
              Page {page + 1} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
