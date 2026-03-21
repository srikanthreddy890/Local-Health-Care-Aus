'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Pill, FileText, Download, Trash2, RefreshCw, Plus, Loader2,
  User, Stethoscope, Clock, Hash, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  useClinicPrescriptions,
  type ClinicPrescription,
  type Medication,
} from '@/lib/hooks/useClinicPrescriptions'
import AddPrescriptionDialog from './AddPrescriptionDialog'

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  dispensed: 'bg-blue-100 text-blue-700',
  partially_dispensed: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ── Status filter tabs ───────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'dispensed' | 'expired'

function filterByStatus(prescriptions: ClinicPrescription[], filter: StatusFilter) {
  if (filter === 'all') return prescriptions
  return prescriptions.filter((p) => p.status === filter)
}

// ── Detail dialog ────────────────────────────────────────────────────────────

function DetailDialog({
  prescription,
  onClose,
  onDownload,
  onDelete,
}: {
  prescription: ClinicPrescription | null
  onClose: () => void
  onDownload: (filePath: string, fileName: string) => void
  onDelete: (id: string, filePath?: string | null) => void
}) {
  function handleDelete() {
    if (!prescription) return
    if (!window.confirm('Delete this prescription? This action cannot be undone.')) return
    onDelete(prescription.id, prescription.file_path)
    onClose()
  }

  const patientName = [prescription?.patient_first_name, prescription?.patient_last_name].filter(Boolean).join(' ') || 'Unknown Patient'

  return (
    <Dialog open={!!prescription} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {prescription?.title}
            {prescription && <StatusBadge status={prescription.status} />}
          </DialogTitle>
          <DialogDescription>
            {prescription?.prescription_date
              ? format(parseISO(prescription.prescription_date), 'PPP')
              : 'Prescription details'}
          </DialogDescription>
        </DialogHeader>

        {prescription && (
          <div className="space-y-4 text-sm">
            {/* Patient */}
            <div>
              <p className="font-medium text-muted-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Patient
              </p>
              <p>{patientName}</p>
            </div>

            {/* Doctor */}
            {prescription.doctor_name && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" /> Prescribed by
                </p>
                <p>{prescription.doctor_name}</p>
              </div>
            )}

            {/* Booking reference */}
            {prescription.booking_reference && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5" /> Appointment Reference
                </p>
                <p className="font-mono text-xs mt-0.5 bg-muted/40 rounded px-2 py-1 inline-block">
                  {prescription.booking_reference}
                </p>
              </div>
            )}

            {/* Expiry */}
            {prescription.expires_at && (
              <div>
                <p className="font-medium text-muted-foreground">Valid Until</p>
                <p>{format(parseISO(prescription.expires_at), 'PPP')}</p>
              </div>
            )}

            {/* Description */}
            {prescription.description && (
              <div>
                <p className="font-medium text-muted-foreground">Description</p>
                <p className="mt-0.5">{prescription.description}</p>
              </div>
            )}

            {/* Prescription text */}
            {prescription.prescription_text && (
              <div>
                <p className="font-medium text-muted-foreground">Prescription Details</p>
                <p className="whitespace-pre-wrap mt-0.5 bg-muted/40 rounded p-2 text-xs leading-relaxed">
                  {prescription.prescription_text}
                </p>
              </div>
            )}

            {/* Medications */}
            <div>
              <p className="font-medium text-muted-foreground">Medications</p>
              {prescription.medications.length === 0 ? (
                <p className="text-muted-foreground mt-1 text-xs">No specific medications listed.</p>
              ) : (
                <div className="space-y-2 mt-1">
                  {prescription.medications.map((med: Medication, i: number) => (
                    <Card key={i} className="p-3">
                      <p className="font-medium">{med.name}</p>
                      {[med.dosage, med.frequency, med.duration].filter(Boolean).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {med.notes && <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>}
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* File */}
            {prescription.file_path && (
              <div>
                <p className="font-medium text-muted-foreground">Attached File</p>
                <div className="mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(prescription.file_path!, prescription.file_name ?? 'prescription')}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {prescription.file_name ?? 'Download'}
                  </Button>
                </div>
              </div>
            )}

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Prescription
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ClinicPrescriptionsTab({ clinicId, userId }: { clinicId: string; userId: string }) {
  const {
    prescriptions, loading, refetch,
    deletePrescription, downloadPrescriptionFile,
  } = useClinicPrescriptions(clinicId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Filter
  const filtered = filterByStatus(prescriptions, statusFilter).filter((p) => {
    const q = search.toLowerCase()
    const patientName = [p.patient_first_name, p.patient_last_name].filter(Boolean).join(' ').toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      patientName.includes(q) ||
      (p.doctor_name ?? '').toLowerCase().includes(q)
    )
  })

  const selected = prescriptions.find((p) => p.id === selectedId) ?? null

  // Status counts
  const counts = {
    all: prescriptions.length,
    active: prescriptions.filter((p) => p.status === 'active').length,
    dispensed: prescriptions.filter((p) => p.status === 'dispensed').length,
    expired: prescriptions.filter((p) => p.status === 'expired').length,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" /> Prescriptions
          </h2>
          <p className="text-sm text-muted-foreground">Manage prescriptions for your patients</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Add Prescription
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by patient, title, or doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
          <TabsTrigger value="dispensed">Dispensed ({counts.dispensed})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({counts.expired})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No prescriptions found.</p>
        </div>
      )}

      {/* Card grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const patientName = [p.patient_first_name, p.patient_last_name].filter(Boolean).join(' ') || 'Unknown Patient'
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left bg-lhc-surface border border-lhc-border rounded-xl p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{p.title}</span>
                      <StatusBadge status={p.status} />
                      {p.file_path && <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{patientName}</span>
                    </div>

                    {p.doctor_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Stethoscope className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.doctor_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                      {p.prescription_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(p.prescription_date), 'PP')}
                        </span>
                      )}
                      {p.medications.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {p.medications.length} medication{p.medications.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {p.file_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPrescriptionFile(p.file_path!, p.file_name ?? 'prescription')}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (window.confirm('Delete this prescription?')) {
                          deletePrescription(p.id, p.file_path)
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <DetailDialog
        prescription={selected}
        onClose={() => setSelectedId(null)}
        onDownload={downloadPrescriptionFile}
        onDelete={deletePrescription}
      />

      {/* Add prescription dialog */}
      <AddPrescriptionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        clinicId={clinicId}
        userId={userId}
        onCreated={refetch}
      />
    </div>
  )
}
