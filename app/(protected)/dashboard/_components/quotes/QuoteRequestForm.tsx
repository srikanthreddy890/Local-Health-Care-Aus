'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Star, MapPin, Stethoscope, Loader2, FileText, ChevronDown } from 'lucide-react'
import { useClinicsByPostcode, type ClinicWithMeta } from '@/lib/hooks/useClinicsByPostcode'
import type { CreateBatchQuoteRequestData } from '@/lib/hooks/useQuoteRequests'
import { cn } from '@/lib/utils'

const COMMON_SERVICES = [
  'Teeth Cleaning', 'Root Canal', 'Dental Implants', 'Teeth Whitening',
  'Braces/Orthodontics', 'Wisdom Tooth Extraction', 'Crown/Bridge', 'Filling',
]

const REQUEST_TYPES = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'treatment_plan', label: 'Treatment Plan' },
  { value: 'insurance_estimate', label: 'Insurance Estimate' },
  { value: 'procedure_quote', label: 'Procedure Quote' },
  { value: 'other', label: 'Other' },
]

const URGENCY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

const MAX_CLINICS = 5
const PAGE_SIZE = 6

interface Props {
  userId: string
  onSubmit: (data: CreateBatchQuoteRequestData) => Promise<boolean>
}

function sortGroup(list: ClinicWithMeta[]) {
  return [...list].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export default function QuoteRequestForm({ userId, onSubmit }: Props) {
  const { clinics, loading: clinicsLoading, userPostcode } = useClinicsByPostcode(userId)

  // Form state
  const [step, setStep] = useState(1)
  const [serviceName, setServiceName] = useState('')
  const [requestType, setRequestType] = useState('general')
  const [urgency, setUrgency] = useState('normal')
  const [preferredDate, setPreferredDate] = useState('')
  const [patientNotes, setPatientNotes] = useState('')
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([])
  const [visibleLocalCount, setVisibleLocalCount] = useState(PAGE_SIZE)
  const [visibleOtherCount, setVisibleOtherCount] = useState(PAGE_SIZE)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Split clinics by postcode match, then sort each group: favorites first → alphabetical
  const localClinics = sortGroup(clinics.filter((c) => userPostcode && c.zip_code === userPostcode))
  const otherClinics = sortGroup(clinics.filter((c) => !userPostcode || c.zip_code !== userPostcode))

  const visibleLocal = localClinics.slice(0, visibleLocalCount)
  const visibleOther = otherClinics.slice(0, visibleOtherCount)

  function handleClinicToggle(clinicId: string) {
    setSelectedClinicIds((prev) => {
      if (prev.includes(clinicId)) return prev.filter((id) => id !== clinicId)
      if (prev.length >= MAX_CLINICS) return prev
      return [...prev, clinicId]
    })
  }

  function handleSelectAll(list: typeof clinics) {
    const idsToAdd = list
      .filter((c) => !selectedClinicIds.includes(c.id))
      .slice(0, MAX_CLINICS - selectedClinicIds.length)
      .map((c) => c.id)
    setSelectedClinicIds((prev) => [...prev, ...idsToAdd])
  }

  async function handleSubmit() {
    if (!serviceName || selectedClinicIds.length === 0) return
    setIsSubmitting(true)
    const ok = await onSubmit({
      clinic_ids: selectedClinicIds,
      service_name: serviceName.trim(),
      request_type: requestType,
      urgency,
      preferred_date: preferredDate || null,
      patient_notes: patientNotes || null,
    })
    setIsSubmitting(false)
    if (ok) {
      setStep(1)
      setServiceName('')
      setRequestType('general')
      setUrgency('normal')
      setPreferredDate('')
      setPatientNotes('')
      setSelectedClinicIds([])
      setVisibleLocalCount(PAGE_SIZE)
      setVisibleOtherCount(PAGE_SIZE)
    }
  }

  function ClinicItem({ clinic }: { clinic: typeof clinics[0] }) {
    const isSelected = selectedClinicIds.includes(clinic.id)
    const isDisabled = !isSelected && selectedClinicIds.length >= MAX_CLINICS
    return (
      <label
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
          isSelected
            ? 'border-lhc-primary bg-lhc-primary/5'
            : isDisabled
              ? 'border-lhc-border bg-lhc-background opacity-50 cursor-not-allowed'
              : 'border-lhc-border bg-lhc-surface hover:bg-lhc-background'
        )}
      >
        <Checkbox
          checked={isSelected}
          disabled={isDisabled}
          onCheckedChange={() => !isDisabled && handleClinicToggle(clinic.id)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {clinic.isFavorite && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />}
            <span className="text-sm font-medium text-lhc-text-main truncate">{clinic.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-lhc-text-muted">
            {clinic.city && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{clinic.city}
              </span>
            )}
            {clinic.serviceCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Stethoscope className="w-3 h-3" />{clinic.serviceCount} services
              </span>
            )}
          </div>
        </div>
      </label>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lhc-text-main flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-lhc-primary" />
          Request a Quote
        </CardTitle>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                step === s
                  ? 'bg-lhc-primary text-white'
                  : step > s
                    ? 'bg-lhc-primary/20 text-lhc-primary'
                    : 'bg-lhc-border text-lhc-text-muted'
              )}>
                {s}
              </div>
              {s < 3 && <div className={cn('h-px w-8', step > s ? 'bg-lhc-primary/30' : 'bg-lhc-border')} />}
            </div>
          ))}
          <span className="text-xs text-lhc-text-muted ml-1">
            {step === 1 ? 'Service' : step === 2 ? 'Details' : 'Clinics'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Step 1: Service ───────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-lhc-text-main mb-2 block">
                What service do you need a quote for?
              </Label>
              <Textarea
                placeholder="Describe the service or treatment you need…"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value.trimStart())}
                className="min-h-[80px]"
              />
            </div>
            <div>
              <p className="text-xs text-lhc-text-muted mb-2">Quick select:</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setServiceName(s)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none transition-colors',
                      serviceName === s
                        ? 'bg-lhc-primary text-white'
                        : 'border border-lhc-border text-lhc-text-main bg-transparent hover:border-lhc-primary/50'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!serviceName.trim()}
            >
              Continue
            </Button>
          </div>
        )}

        {/* ── Step 2: Details ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-lhc-text-main mb-1.5 block">Quote Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-lhc-text-main mb-1.5 block">Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {URGENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-lhc-text-main mb-1.5 block">
                Preferred Date <span className="text-lhc-text-muted font-normal">(optional)</span>
              </Label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-lhc-text-main mb-1.5 block">
                Additional Notes <span className="text-lhc-text-muted font-normal">(optional)</span>
              </Label>
              <Textarea
                placeholder="Any extra context for the clinic…"
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Clinic selection ──────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-lhc-text-muted">
                Select up to {MAX_CLINICS} clinics
                {selectedClinicIds.length > 0 && (
                  <span className="ml-1 font-medium text-lhc-text-main">
                    ({selectedClinicIds.length}/{MAX_CLINICS} selected)
                  </span>
                )}
              </p>
              {selectedClinicIds.length > 0 && (
                <button
                  className="text-xs text-lhc-text-muted underline"
                  onClick={() => setSelectedClinicIds([])}
                >
                  Clear all
                </button>
              )}
            </div>

            {clinicsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
              </div>
            ) : clinics.length === 0 ? (
              <p className="text-sm text-lhc-text-muted text-center py-6">
                No clinics are currently accepting quote requests.
              </p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {/* Local clinics */}
                {localClinics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide">
                        Near You ({localClinics.length})
                      </p>
                      {selectedClinicIds.length < MAX_CLINICS && (
                        <button
                          className="text-xs text-lhc-primary underline"
                          onClick={() => handleSelectAll(localClinics)}
                        >
                          Select all
                        </button>
                      )}
                    </div>
                    {visibleLocal.map((c) => <ClinicItem key={c.id} clinic={c} />)}
                    {localClinics.length > visibleLocalCount && (
                      <button
                        className="w-full flex items-center justify-center gap-1 text-xs text-lhc-text-muted py-1 hover:text-lhc-text-main"
                        onClick={() => setVisibleLocalCount((n) => n + PAGE_SIZE)}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show {Math.min(PAGE_SIZE, localClinics.length - visibleLocalCount)} more
                      </button>
                    )}
                  </div>
                )}

                {/* Other clinics */}
                {otherClinics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide">
                        Other Clinics ({otherClinics.length})
                      </p>
                      {selectedClinicIds.length < MAX_CLINICS && (
                        <button
                          className="text-xs text-lhc-primary underline"
                          onClick={() => handleSelectAll(otherClinics)}
                        >
                          Select all
                        </button>
                      )}
                    </div>
                    {visibleOther.map((c) => <ClinicItem key={c.id} clinic={c} />)}
                    {otherClinics.length > visibleOtherCount && (
                      <button
                        className="w-full flex items-center justify-center gap-1 text-xs text-lhc-text-muted py-1 hover:text-lhc-text-main"
                        onClick={() => setVisibleOtherCount((n) => n + PAGE_SIZE)}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show {Math.min(PAGE_SIZE, otherClinics.length - visibleOtherCount)} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedClinicIds.length === 0 || !serviceName}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                ) : (
                  `Request Quote from ${selectedClinicIds.length} Clinic${selectedClinicIds.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
