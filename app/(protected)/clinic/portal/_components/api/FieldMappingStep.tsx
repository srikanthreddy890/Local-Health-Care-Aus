'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Eye, Pencil } from 'lucide-react'
import {
  STANDARD_BOOKING_FIELDS,
  STANDARD_DOCTOR_FIELDS,
  STANDARD_SLOT_FIELDS,
  type StandardField,
} from '@/lib/customApi/customApiStandardFields'
import VisualFieldMapper from './VisualFieldMapper'

/** Response fields to extract from a booking confirmation */
const BOOKING_RESPONSE_FIELDS: StandardField[] = [
  { key: 'booking_id', label: 'Booking ID', required: true },
  { key: 'status', label: 'Booking Status', required: false },
  { key: 'doctor_id', label: 'Doctor ID', required: false },
  { key: 'doctor_name', label: 'Doctor Name', required: false },
]

interface Props {
  endpointKey: 'get_doctors' | 'get_appointments' | 'book_appointment'
  testResponse: Record<string, unknown>
  mappings: Record<string, unknown>
  onMappingsChange: (mappings: Record<string, unknown>) => void
  bookingResponseConfig?: Record<string, string>
  onBookingResponseConfigChange?: (config: Record<string, string>) => void
}

export default function FieldMappingStep({
  endpointKey,
  testResponse,
  mappings,
  onMappingsChange,
  bookingResponseConfig,
  onBookingResponseConfigChange,
}: Props) {
  const [mode, setMode] = useState<'visual' | 'manual'>('visual')
  const [activeTab, setActiveTab] = useState<'request' | 'response'>(
    endpointKey === 'book_appointment' ? 'request' : 'response'
  )

  const isBookAppointment = endpointKey === 'book_appointment'

  // For book_appointment: two tabs (request + response)
  // For GET endpoints: single response view
  const showingRequest = isBookAppointment && activeTab === 'request'
  const fields = showingRequest
    ? STANDARD_BOOKING_FIELDS
    : isBookAppointment
      ? BOOKING_RESPONSE_FIELDS
      : getFieldsForEndpoint(endpointKey)

  // Get/set the appropriate mapping section
  const currentMappings = (() => {
    if (isBookAppointment && activeTab === 'response') {
      // Response mappings stored in bookingResponseConfig with _field suffix
      const result: Record<string, string> = {}
      if (bookingResponseConfig) {
        if (bookingResponseConfig.booking_id_field) result.booking_id = bookingResponseConfig.booking_id_field
        if (bookingResponseConfig.status_field) result.status = bookingResponseConfig.status_field
        if (bookingResponseConfig.doctor_id_field) result.doctor_id = bookingResponseConfig.doctor_id_field
        if (bookingResponseConfig.doctor_name_field) result.doctor_name = bookingResponseConfig.doctor_name_field
      }
      return result
    }
    if (showingRequest) {
      return ((mappings.request as Record<string, string>) ?? {})
    }
    return ((mappings.response as Record<string, string>) ?? {})
  })()

  function updateMapping(key: string, value: string) {
    if (isBookAppointment && activeTab === 'response') {
      // Store in bookingResponseConfig
      if (onBookingResponseConfigChange && bookingResponseConfig) {
        const keyMap: Record<string, string> = {
          booking_id: 'booking_id_field',
          status: 'status_field',
          doctor_id: 'doctor_id_field',
          doctor_name: 'doctor_name_field',
        }
        onBookingResponseConfigChange({
          ...bookingResponseConfig,
          [keyMap[key] ?? key]: value,
        })
      }
    } else if (showingRequest) {
      onMappingsChange({
        ...mappings,
        request: { ...currentMappings, [key]: value },
      })
    } else {
      onMappingsChange({
        ...mappings,
        response: { ...currentMappings, [key]: value },
      })
    }
  }

  // Count mapped required fields
  const requiredFields = fields.filter((f) => f.required)
  const mappedRequired = requiredFields.filter((f) => !!currentMappings[f.key])

  return (
    <div className="space-y-4 border-t border-lhc-border pt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Tab switcher for book_appointment */}
          {isBookAppointment ? (
            <div className="flex rounded-lg border border-lhc-border overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === 'request'
                    ? 'bg-lhc-primary text-white'
                    : 'bg-white text-lhc-text-muted hover:bg-lhc-surface'
                }`}
              >
                Request Fields
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('response')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-lhc-border ${
                  activeTab === 'response'
                    ? 'bg-lhc-primary text-white'
                    : 'bg-white text-lhc-text-muted hover:bg-lhc-surface'
                }`}
              >
                Response Fields
              </button>
            </div>
          ) : (
            <Label className="text-sm font-semibold">Response Field Mappings</Label>
          )}

          <Badge
            className={
              mappedRequired.length === requiredFields.length
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }
          >
            {mappedRequired.length === requiredFields.length && (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            {mappedRequired.length}/{requiredFields.length} required
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button
            variant={mode === 'visual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('visual')}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Visual
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('manual')}
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Manual
          </Button>
        </div>
      </div>

      {/* Description */}
      {isBookAppointment && (
        <p className="text-xs text-lhc-text-muted">
          {activeTab === 'request'
            ? 'Map your patient data fields to the API\'s expected field names in the request body.'
            : 'Map where to find the booking confirmation details in the API\'s response.'}
        </p>
      )}

      {mode === 'visual' ? (
        <VisualFieldMapper
          jsonData={testResponse}
          fields={fields}
          mappings={currentMappings}
          onMappingChange={updateMapping}
        />
      ) : (
        <ManualMappingEditor
          mappings={currentMappings}
          onChange={(updated) => {
            if (isBookAppointment && activeTab === 'response') {
              // Sync back to bookingResponseConfig
              if (onBookingResponseConfigChange) {
                onBookingResponseConfigChange({
                  ...(bookingResponseConfig ?? {}),
                  booking_id_field: updated.booking_id ?? '',
                  status_field: updated.status ?? '',
                  doctor_id_field: updated.doctor_id ?? '',
                  doctor_name_field: updated.doctor_name ?? '',
                })
              }
            } else if (showingRequest) {
              onMappingsChange({ ...mappings, request: updated })
            } else {
              onMappingsChange({ ...mappings, response: updated })
            }
          }}
        />
      )}
    </div>
  )
}

// ── Manual editor ───────────────────────────────────────────────────────────

function ManualMappingEditor({
  mappings,
  onChange,
}: {
  mappings: Record<string, string>
  onChange: (mappings: Record<string, string>) => void
}) {
  const [jsonText, setJsonText] = useState(JSON.stringify(mappings, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)

  function handleBlur() {
    try {
      const parsed = JSON.parse(jsonText)
      setParseError(null)
      onChange(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        className="font-mono text-xs min-h-[160px]"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onBlur={handleBlur}
      />
      {parseError && <p className="text-xs text-red-500">{parseError}</p>}
    </div>
  )
}

// ── Field helpers ───────────────────────────────────────────────────────────

function getFieldsForEndpoint(key: string): StandardField[] {
  switch (key) {
    case 'get_doctors':
      return STANDARD_DOCTOR_FIELDS
    case 'get_appointments':
      return STANDARD_SLOT_FIELDS
    case 'book_appointment':
      return STANDARD_BOOKING_FIELDS
    default:
      return []
  }
}
