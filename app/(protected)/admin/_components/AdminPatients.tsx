'use client'

import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, User, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminContext } from './AdminContext'
import { useAdminPatients, type AdminPatient } from '@/lib/hooks/useAdminPatients'
import { usePatientBookings } from '@/lib/hooks/usePatientBookings'
import { usePatientPrescriptions } from '@/lib/hooks/usePatientPrescriptions'
import { useAdminPatientQuotes } from '@/lib/hooks/usePatientQuotes'

function PatientDetailModal({
  patient,
  open,
  onClose,
}: {
  patient: AdminPatient | null
  open: boolean
  onClose: () => void
}) {
  const { data: bookings, isLoading: loadingBookings } = usePatientBookings(patient?.id ?? null)
  const { data: prescriptions, isLoading: loadingRx } = usePatientPrescriptions(patient?.id ?? null)
  const { data: quotes, isLoading: loadingQuotes } = useAdminPatientQuotes(patient?.id ?? null)

  if (!patient) return null

  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-lhc-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-lhc-primary" />
            </div>
            {fullName}
          </DialogTitle>
          <DialogDescription>
            <span className="flex flex-wrap gap-3 mt-1 text-sm">
              {patient.phone && <span>Phone: {patient.phone}</span>}
              {patient.city && <span>City: {patient.city}</span>}
              {patient.date_of_birth && <span>DOB: {patient.date_of_birth}</span>}
              {patient.created_at && (
                <span>Joined: {new Date(patient.created_at).toLocaleDateString()}</span>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appointments" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="appointments" className="flex-1">
              Appointments ({bookings?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex-1">
              Prescriptions ({prescriptions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1">
              Quotes ({quotes?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-2 mt-3">
            {loadingBookings ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
              </div>
            ) : bookings?.length === 0 ? (
              <p className="text-sm text-lhc-text-muted text-center py-6">No appointments found.</p>
            ) : (
              bookings?.map((b) => (
                <Card key={b.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-lhc-text-main">
                        {b.serviceName ?? b.doctorName ?? 'Appointment'}
                      </p>
                      <p className="text-xs text-lhc-text-muted">
                        {b.appointmentDate} {b.startTime && `at ${b.startTime}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {b.source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          b.status === 'confirmed'
                            ? 'bg-green-50 text-green-700'
                            : b.status === 'cancelled'
                              ? 'bg-red-50 text-red-700'
                              : ''
                        }`}
                      >
                        {b.status ?? 'unknown'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-2 mt-3">
            {loadingRx ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
              </div>
            ) : prescriptions?.length === 0 ? (
              <p className="text-sm text-lhc-text-muted text-center py-6">No prescriptions found.</p>
            ) : (
              prescriptions?.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-lhc-text-main">{p.title}</p>
                      <p className="text-xs text-lhc-text-muted">
                        {p.doctor_name && `Dr. ${p.doctor_name} · `}
                        {p.prescription_date}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {p.status ?? 'active'}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-2 mt-3">
            {loadingQuotes ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
              </div>
            ) : quotes?.length === 0 ? (
              <p className="text-sm text-lhc-text-muted text-center py-6">No quotes found.</p>
            ) : (
              quotes?.map((q) => (
                <Card key={q.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-lhc-text-main">{q.service_name}</p>
                      <p className="text-xs text-lhc-text-muted">
                        {q.request_type} · {q.urgency} · {new Date(q.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.estimated_cost != null && (
                        <span className="text-sm font-medium text-lhc-text-main">
                          ${q.estimated_cost.toFixed(2)}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {q.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminPatients() {
  const { userId } = useAdminContext()
  const { patients, loading, search, setSearch, page, setPage, totalCount, totalPages } =
    useAdminPatients(userId)
  const [selectedPatient, setSelectedPatient] = useState<AdminPatient | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-lhc-text-main">Patients</h2>
          <p className="text-sm text-lhc-text-muted">{totalCount} registered patients</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
        <Input
          placeholder="Search by name, phone, city, or postcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Patient list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
        </div>
      ) : patients.length === 0 ? (
        <p className="text-center text-lhc-text-muted py-12">No patients found.</p>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => {
            const fullName =
              [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Unknown'
            return (
              <Card
                key={patient.id}
                className="cursor-pointer hover:border-lhc-primary/30 transition-colors"
                onClick={() => setSelectedPatient(patient)}
              >
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-lhc-primary/10 flex items-center justify-center flex-shrink-0">
                    {patient.avatar_url ? (
                      <img
                        src={patient.avatar_url}
                        alt={fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-lhc-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-lhc-text-main">{fullName}</p>
                    <p className="text-xs text-lhc-text-muted">
                      {[patient.phone, patient.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-lhc-text-muted">
                      Joined {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-lhc-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail modal */}
      <PatientDetailModal
        patient={selectedPatient}
        open={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </div>
  )
}
