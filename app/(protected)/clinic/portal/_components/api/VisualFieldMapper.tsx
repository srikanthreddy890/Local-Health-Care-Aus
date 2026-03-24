'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import type { StandardField } from '@/lib/customApi/customApiStandardFields'

interface Props {
  jsonData: Record<string, unknown>
  fields: StandardField[]
  mappings: Record<string, string>
  onMappingChange: (fieldKey: string, jsonPath: string) => void
}

export default function VisualFieldMapper({ jsonData, fields, mappings, onMappingChange }: Props) {
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const fieldRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // When a JSON value is clicked, fill the focused field
  function handleJsonClick(path: string) {
    const target = focusedField ?? getNextEmptyField()
    if (!target) return
    onMappingChange(target, path)

    // Advance focus to next empty field
    const nextEmpty = getNextEmptyFieldAfter(target)
    if (nextEmpty) {
      setFocusedField(nextEmpty)
      fieldRefs.current.get(nextEmpty)?.focus()
    }
  }

  function getNextEmptyField(): string | null {
    return fields.find((f) => !mappings[f.key])?.key ?? null
  }

  function getNextEmptyFieldAfter(current: string): string | null {
    const idx = fields.findIndex((f) => f.key === current)
    for (let i = idx + 1; i < fields.length; i++) {
      if (!mappings[fields[i].key]) return fields[i].key
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: JSON viewer */}
      <div className="border border-lhc-border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-lhc-border">
          <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wider">
            API Response — click a value to map it
          </p>
        </div>
        <div className="p-3 max-h-[400px] overflow-auto">
          <JsonTree data={jsonData} path="" onValueClick={handleJsonClick} />
        </div>
      </div>

      {/* Right: Standard field inputs */}
      <div className="border border-lhc-border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 border-b border-lhc-border">
          <p className="text-xs font-medium text-lhc-text-muted uppercase tracking-wider">
            Standard Fields
          </p>
        </div>
        <div className="p-3 space-y-2.5 max-h-[400px] overflow-auto">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <div className="w-40 shrink-0 flex items-center gap-1.5">
                {mappings[field.key] ? (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                )}
                <span className="text-xs text-lhc-text-main truncate">{field.label}</span>
                {field.required && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">req</Badge>
                )}
              </div>
              <Input
                ref={(el) => {
                  if (el) fieldRefs.current.set(field.key, el)
                }}
                className="text-xs font-mono h-7"
                placeholder="Click JSON value or type path"
                value={mappings[field.key] ?? ''}
                onChange={(e) => onMappingChange(field.key, e.target.value)}
                onFocus={() => setFocusedField(field.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── JSON tree renderer ──────────────────────────────────────────────────────

function JsonTree({
  data,
  path,
  onValueClick,
  depth = 0,
}: {
  data: unknown
  path: string
  onValueClick: (path: string) => void
  depth?: number
}) {
  if (data === null || data === undefined) {
    return <JsonValue path={path} value="null" onClick={onValueClick} />
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-gray-400 text-xs">[]</span>

    // Show first item expanded, rest collapsed
    return (
      <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <span className="text-gray-400 text-xs">[</span>
        <div style={{ marginLeft: 12 }}>
          <JsonTree
            data={data[0]}
            path={stripArrayIndex(path)}
            onValueClick={onValueClick}
            depth={depth + 1}
          />
        </div>
        {data.length > 1 && (
          <span className="text-gray-400 text-xs ml-3">
            ... ({data.length - 1} more)
          </span>
        )}
        <span className="text-gray-400 text-xs">]</span>
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    return (
      <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <span className="text-gray-400 text-xs">{'{'}</span>
        {entries.map(([key, val]) => {
          const childPath = path ? `${path}.${key}` : key
          const isPrimitive = val === null || typeof val !== 'object'
          return (
            <div key={key} className="flex items-start gap-1 py-0.5">
              <span className="text-purple-700 text-xs font-mono shrink-0">
                &quot;{key}&quot;:
              </span>
              {isPrimitive ? (
                <JsonValue path={childPath} value={val} onClick={onValueClick} />
              ) : (
                <JsonTree data={val} path={childPath} onValueClick={onValueClick} depth={depth + 1} />
              )}
            </div>
          )
        })}
        <span className="text-gray-400 text-xs">{'}'}</span>
      </div>
    )
  }

  return <JsonValue path={path} value={data} onClick={onValueClick} />
}

function JsonValue({
  path,
  value,
  onClick,
}: {
  path: string
  value: unknown
  onClick: (path: string) => void
}) {
  const display = typeof value === 'string' ? `"${value}"` : String(value)
  const color =
    typeof value === 'string'
      ? 'text-green-700'
      : typeof value === 'number'
        ? 'text-blue-700'
        : typeof value === 'boolean'
          ? 'text-amber-700'
          : 'text-gray-500'

  return (
    <button
      type="button"
      onClick={() => onClick(path)}
      className={`${color} text-xs font-mono hover:bg-blue-100 hover:ring-1 hover:ring-blue-300 rounded px-0.5 transition-colors cursor-pointer`}
      title={`Map: ${path}`}
    >
      {display}
    </button>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strip array indices from path: data.doctors[0].name → data.doctors.name */
function stripArrayIndex(path: string): string {
  return path.replace(/\[\d+\]/g, '')
}
