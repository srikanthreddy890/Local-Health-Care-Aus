'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  Plus,
  TestTube,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import FieldMappingStep from './FieldMappingStep'

// ── Types ───────────────────────────────────────────────────────────────────

export interface HeaderEntry {
  name: string
  value: string
  sensitive: boolean // true = API key / secret → stored encrypted
}

interface EndpointDef {
  enabled: boolean
  url: string
  method: string
  auth: {
    type: string
    token?: string
    username?: string
    password?: string
    header?: string
  }
  headers: Record<string, string>
  headerEntries?: HeaderEntry[]
  urlParameters?: UrlParam[]
  requestBody?: {
    mode: string
    rawJson?: string
    parameters?: unknown[]
    sampleRequest?: string
  }
}

interface UrlParam {
  name: string
  paramLocation: 'query' | 'path'
  type: 'string' | 'date' | 'datetime'
  defaultValue?: string
  defaultTime?: string
  /** Where the value comes from at runtime */
  source?: 'static' | 'doctor_id' | 'start_date' | 'end_date'
  /** For datetime: format string like 'yyyy-MM-dd HH:mm:ss' or custom pattern */
  datetimeFormat?: string
}

/** Common datetime format presets */
const DATETIME_FORMATS = [
  { value: 'yyyy-MM-dd HH:mm:ss', label: 'yyyy-MM-dd HH:mm:ss', example: '2026-03-25 07:00:00' },
  { value: 'yyyy-MM-ddTHH:mm:ss', label: 'ISO (yyyy-MM-ddTHH:mm:ss)', example: '2026-03-25T07:00:00' },
  { value: 'yyyy-MM-ddTHH:mm:ssZ', label: 'ISO+Z (yyyy-MM-ddTHH:mm:ssZ)', example: '2026-03-25T07:00:00Z' },
  { value: 'yyyy-MM-dd', label: 'Date only (yyyy-MM-dd)', example: '2026-03-25' },
  { value: 'dd/MM/yyyy HH:mm', label: 'dd/MM/yyyy HH:mm', example: '25/03/2026 07:00' },
  { value: 'MM/dd/yyyy HH:mm:ss', label: 'MM/dd/yyyy HH:mm:ss', example: '03/25/2026 07:00:00' },
  { value: 'custom', label: 'Custom format...', example: '' },
]

const DEFAULT_START_TIME = '07:00:00'
const DEFAULT_END_TIME = '20:00:00'

/** Format a date + time string according to the selected format pattern */
function formatDatetime(date: string, time: string, format: string): string {
  // date = 'yyyy-MM-dd', time = 'HH:mm:ss'
  const [y, mo, d] = date.split('-')
  const [h, mi, s] = (time || '00:00:00').split(':')

  return format
    .replace('yyyy', y)
    .replace('MM', mo)
    .replace('dd', d)
    .replace('HH', h)
    .replace('mm', mi)
    .replace('ss', s || '00')
}

/** Reference: which JSON field names the edge function recognizes and auto-replaces */
const BOOKING_TEMPLATE_FIELDS = [
  { apiNames: ['firstName', 'first_name', 'givenName'], description: 'Patient first name', example: '"John"' },
  { apiNames: ['lastName', 'last_name', 'familyName', 'surname'], description: 'Patient last name', example: '"Doe"' },
  { apiNames: ['email'], description: 'Patient email', example: '"test@example.com"' },
  { apiNames: ['mobile', 'phone', 'phoneNumber', 'cellphone'], description: 'Patient phone', example: '"0412345678"' },
  { apiNames: ['dob', 'dateOfBirth', 'date_of_birth'], description: 'Date of birth', example: '"2000-01-01"' },
  { apiNames: ['slotId', 'slot_id', 'appointmentId', 'timeSlotId'], description: 'Slot/appointment ID', example: '12345' },
  { apiNames: ['doctorId', 'doctor_id', 'practitionerId'], description: 'Doctor ID', example: '5092' },
  { apiNames: ['notes', 'comments', 'reason'], description: 'Booking notes', example: '"string"' },
  { apiNames: ['title'], description: 'Patient title (0=Mr, 1=Mrs, etc.)', example: '0' },
]

/** Sample values for auto-generating template from field mappings */
const BOOKING_FIELD_SAMPLES: Record<string, string | number | boolean> = {
  patient_first_name: 'John',
  patient_last_name: 'Doe',
  patient_email: 'test@example.com',
  patient_mobile: '0412345678',
  patient_phone: '0412345678',
  patient_dob: '2000-01-01',
  slot_id: 12345,
  doctor_id: 5092,
  appointment_date: '2026-03-25',
  appointment_time: '10:00:00',
  notes: 'string',
  patient_notes: 'string',
  service_name: 'General Consultation',
}

interface WizardState {
  integrationType: string
  configName: string
  environment: string
  endpointConfig: Record<string, unknown>
  fieldMappings: Record<string, unknown>
  bookingResponseConfig: Record<string, unknown>
  authMethod: string
  apiKey: string
  practiceId: string
}

interface Props {
  clinicId: string
  state: WizardState
  onStateChange: (updates: Partial<WizardState>) => void
  onSubmit: () => void
  isSubmitting: boolean
}

type Phase = 'get_doctors' | 'get_appointments' | 'book_appointment'

const PHASES: { key: Phase; label: string; description: string }[] = [
  { key: 'get_doctors', label: 'Get Doctors', description: 'Configure how to fetch the doctor list from your API' },
  { key: 'get_appointments', label: 'Get Appointments', description: 'Configure how to fetch available appointment slots' },
  { key: 'book_appointment', label: 'Book Appointment', description: 'Configure how to create a booking through your API' },
]

const AUTH_TYPES = [
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key (Custom Header)' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'custom', label: 'Custom' },
]

// ── Component ───────────────────────────────────────────────────────────────

export default function EndpointConfigurationStep({
  clinicId,
  state,
  onStateChange,
  onSubmit,
  isSubmitting,
}: Props) {
  const [activePhase, setActivePhase] = useState<Phase>('get_doctors')
  const [testResults, setTestResults] = useState<Record<Phase, 'idle' | 'testing' | 'success' | 'failed'>>({
    get_doctors: 'idle',
    get_appointments: 'idle',
    book_appointment: 'idle',
  })
  const [testResponseData, setTestResponseData] = useState<Record<Phase, Record<string, unknown> | null>>({
    get_doctors: null,
    get_appointments: null,
    book_appointment: null,
  })
  const [testErrorDetails, setTestErrorDetails] = useState<Record<Phase, string | null>>({
    get_doctors: null,
    get_appointments: null,
    book_appointment: null,
  })
  const [showTestResponse, setShowTestResponse] = useState<Phase | null>(null)
  const [extractedDoctors, setExtractedDoctors] = useState<{ id: string; name: string }[]>([])
  const [selectedTestDoctor, setSelectedTestDoctor] = useState('')
  const [selectedTestDate, setSelectedTestDate] = useState(new Date().toISOString().split('T')[0])

  // ── Endpoint state helpers ──────────────────────────────────────────

  function getEndpoint(phase: Phase): EndpointDef {
    const ep = (state.endpointConfig as Record<string, EndpointDef>)?.[phase]
    return ep ?? {
      enabled: true,
      url: '',
      method: phase === 'book_appointment' ? 'POST' : 'GET',
      auth: { type: 'bearer', token: '' },
      headers: {},
      headerEntries: [],
      urlParameters: [],
    }
  }

  function setEndpoint(phase: Phase, updates: Partial<EndpointDef>) {
    const current = getEndpoint(phase)
    const updated = { ...current, ...updates }
    onStateChange({
      endpointConfig: {
        ...(state.endpointConfig as Record<string, unknown>),
        [phase]: updated,
      },
    })
  }

  // ── Test endpoint ───────────────────────────────────────────────────

  async function handleTest(phase: Phase) {
    const ep = getEndpoint(phase)
    if (!ep.url) {
      toast.error('Please enter a URL first')
      return
    }

    setTestResults((prev) => ({ ...prev, [phase]: 'testing' }))
    setTestErrorDetails((prev) => ({ ...prev, [phase]: null }))
    try {
      // Build headers from headerEntries
      const requestHeaders: Record<string, string> = {}
      if (ep.headerEntries?.length) {
        for (const entry of ep.headerEntries) {
          if (entry.name) requestHeaders[entry.name] = entry.value
        }
      } else if (ep.headers) {
        Object.assign(requestHeaders, ep.headers)
      }

      // Add auth headers based on auth type
      if (ep.auth.type === 'bearer' && ep.auth.token) {
        requestHeaders['Authorization'] = `Bearer ${ep.auth.token}`
      } else if (ep.auth.type === 'api_key' && ep.auth.token) {
        requestHeaders[ep.auth.header || 'X-API-Key'] = ep.auth.token
      } else if (ep.auth.type === 'basic' && ep.auth.username) {
        requestHeaders['Authorization'] = `Basic ${btoa(`${ep.auth.username}:${ep.auth.password || ''}`)}`
      }

      // Resolve runtime parameter values for testing
      const resolvedParams = (ep.urlParameters ?? []).map((param) => {
        if (param.source === 'doctor_id' && selectedTestDoctor) {
          return { ...param, defaultValue: selectedTestDoctor }
        }
        if (param.source === 'start_date' && selectedTestDate) {
          const time = param.defaultTime ?? DEFAULT_START_TIME
          const fmt = param.datetimeFormat === 'custom'
            ? (param.defaultValue || 'yyyy-MM-dd HH:mm:ss')
            : (param.datetimeFormat ?? 'yyyy-MM-dd HH:mm:ss')
          return { ...param, defaultValue: formatDatetime(selectedTestDate, time, fmt) }
        }
        if (param.source === 'end_date' && selectedTestDate) {
          const time = param.defaultTime ?? DEFAULT_END_TIME
          const fmt = param.datetimeFormat === 'custom'
            ? (param.defaultValue || 'yyyy-MM-dd HH:mm:ss')
            : (param.datetimeFormat ?? 'yyyy-MM-dd HH:mm:ss')
          return { ...param, defaultValue: formatDatetime(selectedTestDate, time, fmt) }
        }
        return param
      })

      // Call our server-side proxy to avoid CORS
      const proxyResponse = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: ep.url,
          method: ep.method || 'GET',
          headers: requestHeaders,
          urlParameters: resolvedParams,
          requestBody: ep.requestBody?.rawJson || undefined,
          ...(phase === 'get_appointments' ? { doctorId: selectedTestDoctor, date: selectedTestDate } : {}),
        }),
      })

      const result = await proxyResponse.json() as {
        success?: boolean
        status?: number
        statusText?: string
        data?: unknown
        error?: string
      }

      if (!proxyResponse.ok || result.error) {
        const errMsg = result.error || `Proxy error: HTTP ${proxyResponse.status}`
        setTestResults((prev) => ({ ...prev, [phase]: 'failed' }))
        setTestErrorDetails((prev) => ({ ...prev, [phase]: errMsg }))
        if (result.data) setTestResponseData((prev) => ({ ...prev, [phase]: result.data as Record<string, unknown> }))
        toast.error(`Test failed: ${errMsg}`)
        return
      }

      const responseData = (result.data ?? null) as Record<string, unknown> | null

      if (!result.success) {
        const errMsg = `HTTP ${result.status} ${result.statusText || ''}\n\nThe external API returned an error. Check your URL, authentication, and parameters.`
        setTestResults((prev) => ({ ...prev, [phase]: 'failed' }))
        setTestErrorDetails((prev) => ({ ...prev, [phase]: errMsg }))
        setTestResponseData((prev) => ({ ...prev, [phase]: responseData }))
        toast.error(`HTTP ${result.status}: ${result.statusText || 'Request failed'}`)
        return
      }

      setTestResults((prev) => ({ ...prev, [phase]: 'success' }))
      setTestResponseData((prev) => ({ ...prev, [phase]: responseData }))

      // Extract doctors from get_doctors response
      if (phase === 'get_doctors' && responseData) {
        const doctors = extractDoctorList(responseData)
        if (doctors.length > 0) {
          setExtractedDoctors(doctors)
          setSelectedTestDoctor(String(doctors[0].id))
          toast.success(`Found ${doctors.length} doctor(s)`)
        } else {
          toast.success('Test passed but no doctors found in response')
        }
      } else {
        toast.success('Endpoint test passed')
      }
    } catch (err) {
      let errMsg = 'Unknown error'
      if (err instanceof Error) {
        errMsg = err.message
        // Try to get more context from the error
        if ('cause' in err && err.cause) errMsg += `\nCause: ${JSON.stringify(err.cause)}`
      } else if (typeof err === 'string') {
        errMsg = err
      } else {
        errMsg = JSON.stringify(err)
      }
      setTestResults((prev) => ({ ...prev, [phase]: 'failed' }))
      setTestErrorDetails((prev) => ({ ...prev, [phase]: errMsg }))
      toast.error(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ── Phase navigation ──────────────────────────────────────────────────

  function isPhaseUnlocked(phase: Phase): boolean {
    const idx = PHASES.findIndex((p) => p.key === phase)
    if (idx === 0) return true
    return testResults[PHASES[idx - 1].key] === 'success'
  }

  function canSubmit(): boolean {
    return testResults.get_doctors === 'success' && testResults.get_appointments === 'success'
  }

  // ── Render ────────────────────────────────────────────────────────────

  const ep = getEndpoint(activePhase)

  return (
    <div className="space-y-6">
      {/* Config name + environment */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Configuration Name</Label>
          <Input
            value={state.configName}
            onChange={(e) => onStateChange({ configName: e.target.value })}
            placeholder="e.g. My Clinic API"
          />
        </div>
        <div>
          <Label>Environment</Label>
          <select
            className="w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm"
            value={state.environment}
            onChange={(e) => onStateChange({ environment: e.target.value })}
          >
            <option value="production">Production</option>
            <option value="sandbox">Sandbox</option>
            <option value="testing">Testing</option>
          </select>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2 border-b border-lhc-border pb-2">
        {PHASES.map((phase) => {
          const unlocked = isPhaseUnlocked(phase.key)
          const result = testResults[phase.key]
          return (
            <button
              key={phase.key}
              onClick={() => unlocked && setActivePhase(phase.key)}
              disabled={!unlocked}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
                activePhase === phase.key
                  ? 'text-lhc-primary border-b-2 border-lhc-primary'
                  : unlocked
                    ? 'text-lhc-text-muted hover:text-lhc-text-main'
                    : 'text-lhc-text-muted/40 cursor-not-allowed'
              }`}
            >
              {!unlocked && <Lock className="w-3.5 h-3.5" />}
              {result === 'success' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
              {phase.label}
            </button>
          )
        })}
      </div>

      {/* Active phase content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {PHASES.find((p) => p.key === activePhase)?.label}
          </CardTitle>
          <p className="text-sm text-lhc-text-muted">
            {PHASES.find((p) => p.key === activePhase)?.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL + Method */}
          <div className="flex gap-2">
            <div className="w-28">
              <Label>Method</Label>
              <select
                className="w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm"
                value={ep.method}
                onChange={(e) => setEndpoint(activePhase, { method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div className="flex-1">
              <Label>URL</Label>
              <Input
                placeholder="https://api.example.com/doctors"
                value={ep.url}
                onChange={(e) => setEndpoint(activePhase, { url: e.target.value })}
              />
            </div>
          </div>

          {/* Auth */}
          <div className="space-y-3">
            <Label>Authentication</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Auth Type</Label>
                <select
                  className="w-full rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm"
                  value={ep.auth.type}
                  onChange={(e) => setEndpoint(activePhase, { auth: { ...ep.auth, type: e.target.value } })}
                >
                  {AUTH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {(ep.auth.type === 'bearer' || ep.auth.type === 'api_key') && (
                <div>
                  <Label className="text-xs">
                    {ep.auth.type === 'bearer' ? 'Token' : 'API Key'}
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter token / key"
                    value={ep.auth.token ?? ''}
                    onChange={(e) => setEndpoint(activePhase, { auth: { ...ep.auth, token: e.target.value } })}
                  />
                </div>
              )}
              {ep.auth.type === 'api_key' && (
                <div>
                  <Label className="text-xs">Header Name</Label>
                  <Input
                    placeholder="X-API-Key"
                    value={ep.auth.header ?? ''}
                    onChange={(e) => setEndpoint(activePhase, { auth: { ...ep.auth, header: e.target.value } })}
                  />
                </div>
              )}
              {ep.auth.type === 'basic' && (
                <>
                  <div>
                    <Label className="text-xs">Username</Label>
                    <Input
                      value={ep.auth.username ?? ''}
                      onChange={(e) => setEndpoint(activePhase, { auth: { ...ep.auth, username: e.target.value } })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Password</Label>
                    <Input
                      type="password"
                      value={ep.auth.password ?? ''}
                      onChange={(e) => setEndpoint(activePhase, { auth: { ...ep.auth, password: e.target.value } })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Custom headers */}
          <HeadersEditor
            entries={ep.headerEntries ?? Object.entries(ep.headers).map(([name, value]) => ({
              name,
              value,
              sensitive: value === '[ENCRYPTED]',
            }))}
            onChange={(headerEntries) => {
              // Keep headers Record in sync for backward compatibility
              const headers: Record<string, string> = {}
              for (const e of headerEntries) {
                if (e.name) headers[e.name] = e.value
              }
              setEndpoint(activePhase, { headers, headerEntries })
            }}
          />

          {/* URL Parameters */}
          <UrlParametersEditor
            params={ep.urlParameters ?? []}
            onChange={(urlParameters) => setEndpoint(activePhase, { urlParameters })}
            phase={activePhase}
          />

          {/* Phase-specific: get_appointments doctor/date selector */}
          {activePhase === 'get_appointments' && extractedDoctors.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 p-3 bg-blue-50 rounded-lg">
              <div>
                <Label className="text-xs">Test Doctor</Label>
                <select
                  className="w-full rounded-md border border-lhc-border bg-white px-3 py-2 text-sm"
                  value={selectedTestDoctor}
                  onChange={(e) => setSelectedTestDoctor(e.target.value)}
                >
                  {extractedDoctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Test Date</Label>
                <Input
                  type="date"
                  value={selectedTestDate}
                  onChange={(e) => setSelectedTestDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Phase-specific: book_appointment request body */}
          {activePhase === 'book_appointment' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Request Body (JSON Template)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    // Auto-generate template from field mappings
                    const requestMappings = (state.fieldMappings as Record<string, Record<string, Record<string, string>>>)
                      ?.book_appointment?.request ?? {}
                    const template: Record<string, string | number | boolean> = {}
                    for (const [standardKey, externalKey] of Object.entries(requestMappings)) {
                      if (!externalKey || externalKey.startsWith('@')) continue
                      template[externalKey] = BOOKING_FIELD_SAMPLES[standardKey] ?? 'string'
                    }
                    if (Object.keys(template).length > 0) {
                      setEndpoint(activePhase, {
                        requestBody: { mode: 'json', rawJson: JSON.stringify(template, null, 2) },
                      })
                    }
                  }}
                >
                  Generate from field mappings
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <Textarea
                    className="font-mono text-xs min-h-[200px]"
                    placeholder='{\n  "firstName": "John",\n  "lastName": "Doe",\n  "slotId": "123"\n}'
                    value={ep.requestBody?.rawJson ?? ''}
                    onChange={(e) =>
                      setEndpoint(activePhase, {
                        requestBody: { ...(ep.requestBody ?? { mode: 'json' }), mode: 'json', rawJson: e.target.value },
                      })
                    }
                  />
                  <p className="text-xs text-lhc-text-muted mt-1">
                    Enter your API&apos;s expected request body with sample values. The system will replace them with real patient data at booking time.
                  </p>
                </div>
                <div className="border border-lhc-border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b border-lhc-border">
                    <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wider">
                      Field replacement guide
                    </p>
                  </div>
                  <div className="p-3 space-y-1.5 max-h-[250px] overflow-auto text-xs">
                    {/* Show configured mappings first (these are guaranteed to work) */}
                    {(() => {
                      const requestMappings = (state.fieldMappings as Record<string, Record<string, Record<string, string>>>)
                        ?.book_appointment?.request ?? {}
                      const mappedEntries = Object.entries(requestMappings).filter(([, v]) => v && !v.startsWith('@'))
                      if (mappedEntries.length > 0) {
                        return (
                          <>
                            <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider pb-1">
                              Your configured mappings (from Request Field Mappings above)
                            </p>
                            {mappedEntries.map(([standardKey, externalKey]) => {
                              const fieldDef = BOOKING_TEMPLATE_FIELDS.find((f) =>
                                f.apiNames.some((n) => n.toLowerCase() === standardKey.replace('patient_', '').toLowerCase()) ||
                                standardKey.includes(f.apiNames[0].toLowerCase())
                              )
                              return (
                                <div key={standardKey} className="flex gap-2 items-center">
                                  <code className="text-green-700 font-mono shrink-0">{externalKey}</code>
                                  <span className="text-lhc-text-muted">
                                    {fieldDef?.description ?? standardKey.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-gray-400 ml-auto shrink-0">
                                    {BOOKING_FIELD_SAMPLES[standardKey] !== undefined
                                      ? typeof BOOKING_FIELD_SAMPLES[standardKey] === 'string'
                                        ? `"${BOOKING_FIELD_SAMPLES[standardKey]}"`
                                        : String(BOOKING_FIELD_SAMPLES[standardKey])
                                      : '"..."'}
                                  </span>
                                </div>
                              )
                            })}
                            <div className="border-t border-lhc-border my-2" />
                          </>
                        )
                      }
                      return null
                    })()}
                    <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider pb-1">
                      Auto-detected field names
                    </p>
                    {BOOKING_TEMPLATE_FIELDS.map(({ apiNames, description, example }) => (
                      <div key={apiNames[0]} className="flex gap-2">
                        <code className="text-purple-700 font-mono shrink-0">{apiNames.slice(0, 2).join(', ')}</code>
                        <span className="text-lhc-text-muted">{description}</span>
                        <span className="text-gray-400 ml-auto shrink-0">{example}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-lhc-text-muted pt-2 border-t border-lhc-border mt-2">
                      <strong>How it works:</strong> Use your API&apos;s field names as keys in the JSON. The system replaces values using: (1) your configured Request Field Mappings above, then (2) auto-detection by key name. Any field name works if mapped above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Field mappings for the active phase */}
          {testResults[activePhase] === 'success' && testResponseData[activePhase] && (
            <FieldMappingStep
              endpointKey={activePhase}
              testResponse={testResponseData[activePhase] as Record<string, unknown>}
              mappings={(state.fieldMappings as Record<string, Record<string, unknown>>)?.[activePhase] ?? {}}
              onMappingsChange={(mappings) =>
                onStateChange({
                  fieldMappings: {
                    ...(state.fieldMappings as Record<string, unknown>),
                    [activePhase]: mappings,
                  },
                })
              }
              bookingResponseConfig={
                activePhase === 'book_appointment'
                  ? (state.bookingResponseConfig as Record<string, string>)
                  : undefined
              }
              onBookingResponseConfigChange={
                activePhase === 'book_appointment'
                  ? (config) => onStateChange({ bookingResponseConfig: config })
                  : undefined
              }
            />
          )}

          {/* Test button + results */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Button
              onClick={() => handleTest(activePhase)}
              disabled={!ep.url || testResults[activePhase] === 'testing'}
              variant="outline"
            >
              {testResults[activePhase] === 'testing' ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-1.5" />
              )}
              Test Endpoint
            </Button>
            {testResults[activePhase] === 'success' && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Test Passed
              </Badge>
            )}
            {testResults[activePhase] === 'failed' && (
              <Badge variant="destructive">Test Failed</Badge>
            )}
            {(testResults[activePhase] === 'success' || testResults[activePhase] === 'failed') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowTestResponse(showTestResponse === activePhase ? null : activePhase)}
              >
                {showTestResponse === activePhase ? 'Hide' : 'View'} Response
              </Button>
            )}

            {/* Next phase or submit */}
            <div className="ml-auto flex items-center gap-2">
              {activePhase !== 'book_appointment' && testResults[activePhase] === 'success' && (
                <Button
                  onClick={() => {
                    const idx = PHASES.findIndex((p) => p.key === activePhase)
                    if (idx < PHASES.length - 1) setActivePhase(PHASES[idx + 1].key)
                  }}
                  className="bg-lhc-primary hover:bg-lhc-primary/90 text-white"
                >
                  Next: {PHASES[PHASES.findIndex((p) => p.key === activePhase) + 1]?.label}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {canSubmit() && (
                <>
                  {testResults.book_appointment !== 'success' && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Booking endpoint not tested
                    </span>
                  )}
                  <Button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="bg-lhc-primary hover:bg-lhc-primary/90 text-white"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    Save Configuration
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Error details — always visible on failure */}
          {testResults[activePhase] === 'failed' && testErrorDetails[activePhase] && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium text-red-800">Error Details</p>
              <pre className="text-xs text-red-700 whitespace-pre-wrap break-all font-mono">
                {testErrorDetails[activePhase]}
              </pre>
            </div>
          )}

          {/* Response viewer — shows on toggle, handles both data and no-data cases */}
          {showTestResponse === activePhase && (
            <div className="bg-gray-50 border border-lhc-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-lhc-border bg-white flex items-center justify-between">
                <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wider">
                  API Response
                </p>
                <Badge variant="outline" className="text-[10px]">
                  {testResults[activePhase] === 'success' ? 'OK' : 'Error'}
                </Badge>
              </div>
              <pre className="p-3 text-xs font-mono text-lhc-text-main overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
                {testResponseData[activePhase]
                  ? JSON.stringify(testResponseData[activePhase], null, 2)
                  : testErrorDetails[activePhase]
                    ? `Error: ${testErrorDetails[activePhase]}`
                    : 'No response data received'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function HeadersEditor({
  entries,
  onChange,
}: {
  entries: HeaderEntry[]
  onChange: (entries: HeaderEntry[]) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Custom Headers</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...entries, { name: '', value: '', sensitive: false }])}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <Input
            placeholder="Header name"
            value={entry.name}
            className="text-sm w-36"
            onChange={(e) => {
              const next = [...entries]
              next[i] = { ...entry, name: e.target.value }
              onChange(next)
            }}
          />
          <Input
            placeholder="Value"
            value={entry.value}
            className="text-sm flex-1"
            type={entry.sensitive ? 'password' : 'text'}
            onChange={(e) => {
              const next = [...entries]
              next[i] = { ...entry, value: e.target.value }
              onChange(next)
            }}
          />
          <select
            className="rounded-md border border-lhc-border bg-lhc-surface px-2 py-2 text-xs w-28"
            value={entry.sensitive ? 'secret' : 'regular'}
            onChange={(e) => {
              const next = [...entries]
              next[i] = { ...entry, sensitive: e.target.value === 'secret' }
              onChange(next)
            }}
          >
            <option value="regular">Regular</option>
            <option value="secret">Secret</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(entries.filter((_, j) => j !== i))}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      ))}
      {entries.some((e) => e.sensitive) && (
        <p className="text-xs text-amber-600">
          Headers marked as &quot;Secret&quot; will be encrypted before storage.
        </p>
      )}
    </div>
  )
}

function UrlParametersEditor({
  params,
  onChange,
  phase,
}: {
  params: UrlParam[]
  onChange: (params: UrlParam[]) => void
  phase?: string
}) {
  const showSource = phase === 'get_appointments' || phase === 'book_appointment'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>URL Parameters</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange([...params, { name: '', paramLocation: 'query', type: 'string', source: 'static' }])
          }
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>
      {params.map((param, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <Input
            placeholder="Parameter name"
            value={param.name}
            className="text-sm w-32"
            onChange={(e) => {
              const next = [...params]
              next[i] = { ...param, name: e.target.value }
              onChange(next)
            }}
          />
          <select
            className="rounded-md border border-lhc-border bg-lhc-surface px-2 py-2 text-sm w-24"
            value={param.paramLocation}
            onChange={(e) => {
              const next = [...params]
              next[i] = { ...param, paramLocation: e.target.value as 'query' | 'path' }
              onChange(next)
            }}
          >
            <option value="query">Query</option>
            <option value="path">Path</option>
          </select>
          <select
            className="rounded-md border border-lhc-border bg-lhc-surface px-2 py-2 text-sm w-28"
            value={param.type}
            onChange={(e) => {
              const next = [...params]
              next[i] = { ...param, type: e.target.value as 'string' | 'date' | 'datetime' }
              onChange(next)
            }}
          >
            <option value="string">String</option>
            <option value="date">Date</option>
            <option value="datetime">DateTime</option>
          </select>
          {showSource ? (
            <select
              className="rounded-md border border-lhc-border bg-lhc-surface px-2 py-2 text-sm w-32"
              value={param.source ?? 'static'}
              onChange={(e) => {
                const next = [...params]
                next[i] = { ...param, source: e.target.value as UrlParam['source'] }
                onChange(next)
              }}
            >
              <option value="static">Static Value</option>
              <option value="doctor_id">Doctor ID (from Step 1)</option>
              <option value="start_date">Start Date</option>
              <option value="end_date">End Date</option>
            </select>
          ) : null}
          {(!showSource || param.source === 'static' || !param.source) && (
            <Input
              placeholder="Default"
              value={param.defaultValue ?? ''}
              className="text-sm w-28"
              onChange={(e) => {
                const next = [...params]
                next[i] = { ...param, defaultValue: e.target.value }
                onChange(next)
              }}
            />
          )}
          {showSource && param.source === 'doctor_id' && (
            <span className="text-xs text-lhc-text-muted italic">Auto-filled from selected doctor</span>
          )}
          {showSource && (param.source === 'start_date' || param.source === 'end_date') && (
            <div className="flex gap-2 items-center w-full mt-1">
              <div className="flex-1">
                <label className="text-[10px] text-lhc-text-muted">Time</label>
                <Input
                  type="time"
                  step="1"
                  value={param.defaultTime ?? (param.source === 'start_date' ? DEFAULT_START_TIME : DEFAULT_END_TIME)}
                  className="text-sm h-8"
                  onChange={(e) => {
                    const next = [...params]
                    next[i] = { ...param, defaultTime: e.target.value }
                    onChange(next)
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-lhc-text-muted">Format</label>
                <select
                  className="w-full rounded-md border border-lhc-border bg-lhc-surface px-2 py-1.5 text-sm h-8"
                  value={param.datetimeFormat ?? 'yyyy-MM-dd HH:mm:ss'}
                  onChange={(e) => {
                    const next = [...params]
                    next[i] = { ...param, datetimeFormat: e.target.value }
                    onChange(next)
                  }}
                >
                  {DATETIME_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              {param.datetimeFormat === 'custom' && (
                <div className="flex-1">
                  <label className="text-[10px] text-lhc-text-muted">Custom pattern</label>
                  <Input
                    placeholder="yyyy-MM-dd HH:mm:ss"
                    value={param.defaultValue ?? ''}
                    className="text-sm h-8"
                    onChange={(e) => {
                      const next = [...params]
                      next[i] = { ...param, defaultValue: e.target.value }
                      onChange(next)
                    }}
                  />
                </div>
              )}
              <div className="pt-3">
                <span className="text-[10px] text-lhc-text-muted">
                  Preview: {formatDatetime(
                    new Date().toISOString().split('T')[0],
                    param.defaultTime ?? (param.source === 'start_date' ? DEFAULT_START_TIME : DEFAULT_END_TIME),
                    param.datetimeFormat === 'custom'
                      ? (param.defaultValue || 'yyyy-MM-dd HH:mm:ss')
                      : (param.datetimeFormat ?? 'yyyy-MM-dd HH:mm:ss')
                  )}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(params.filter((_, j) => j !== i))}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractDoctorId(d: Record<string, unknown>): string {
  return String(d.id ?? d.doctorId ?? d.doctor_id ?? d.DoctorId ?? d.practitionerId ?? d.providerId ?? '')
}

function extractDoctorName(d: Record<string, unknown>): string {
  if (d.name) return String(d.name)
  if (d.fullName) return String(d.fullName)
  if (d.doctorName) return String(d.doctorName)
  if (d.doctor_name) return String(d.doctor_name)
  if (d.displayName) return String(d.displayName)
  const first = d.firstName ?? d.first_name ?? d.givenName ?? ''
  const last = d.lastName ?? d.last_name ?? d.surname ?? d.familyName ?? ''
  if (first || last) return [first, last].filter(Boolean).join(' ')
  return 'Unknown'
}

function extractDoctorList(data: unknown): { id: string; name: string }[] {
  if (!data || typeof data !== 'object') return []

  // Direct array
  if (Array.isArray(data)) {
    return (data as Record<string, unknown>[])
      .filter((d) => typeof d === 'object' && d !== null)
      .map((d) => ({ id: extractDoctorId(d), name: extractDoctorName(d) }))
      .filter((d) => d.id)
  }

  const obj = data as Record<string, unknown>

  // Try known wrapper keys
  for (const key of ['doctors', 'data', 'practitioners', 'results', 'items', 'records']) {
    const arr = obj[key]
    if (Array.isArray(arr) && arr.length > 0) {
      return (arr as Record<string, unknown>[])
        .filter((d) => typeof d === 'object' && d !== null)
        .map((d) => ({ id: extractDoctorId(d), name: extractDoctorName(d) }))
        .filter((d) => d.id)
    }
  }

  return []
}
