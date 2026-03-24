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

  // For book_appointment: show REQUEST field mappings (standardized → external).
  // Response extraction (booking_id, status) is handled by bookingResponseConfig below.
  // For GET endpoints: show RESPONSE field mappings (external → standardized).
  const isRequest = endpointKey === 'book_appointment'
  const fields = getFieldsForEndpoint(endpointKey)

  const currentMappings = (isRequest
    ? (mappings.request as Record<string, string>) ?? {}
    : (mappings.response as Record<string, string>) ?? {}
  ) as Record<string, string>

  function updateMapping(key: string, value: string) {
    if (isRequest) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">
            {isRequest ? 'Request' : 'Response'} Field Mappings
          </Label>
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
            if (isRequest) {
              onMappingsChange({ ...mappings, request: updated })
            } else {
              onMappingsChange({ ...mappings, response: updated })
            }
          }}
        />
      )}

      {/* Booking response config for book_appointment */}
      {endpointKey === 'book_appointment' && bookingResponseConfig && onBookingResponseConfigChange && (
        <div className="space-y-3 border-t border-lhc-border pt-4">
          <Label className="text-sm font-semibold">Response Field Extraction</Label>
          <p className="text-xs text-lhc-text-muted">
            Specify JSON paths to extract from the booking API response.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Booking ID Field</Label>
              <Input
                placeholder="e.g. data.bookingId"
                value={bookingResponseConfig.booking_id_field ?? ''}
                onChange={(e) =>
                  onBookingResponseConfigChange({
                    ...bookingResponseConfig,
                    booking_id_field: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Slot ID Field</Label>
              <Input
                placeholder="e.g. data.slotId"
                value={bookingResponseConfig.slot_id_field ?? ''}
                onChange={(e) =>
                  onBookingResponseConfigChange({
                    ...bookingResponseConfig,
                    slot_id_field: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Doctor ID Field</Label>
              <Input
                placeholder="e.g. data.doctorId"
                value={bookingResponseConfig.doctor_id_field ?? ''}
                onChange={(e) =>
                  onBookingResponseConfigChange({
                    ...bookingResponseConfig,
                    doctor_id_field: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Doctor Name Field</Label>
              <Input
                placeholder="e.g. data.doctorName"
                value={bookingResponseConfig.doctor_name_field ?? ''}
                onChange={(e) =>
                  onBookingResponseConfigChange({
                    ...bookingResponseConfig,
                    doctor_name_field: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>
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
