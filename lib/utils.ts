import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns up to two initials from a display name, e.g. "Jane Doe" → "JD". */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** Formats a date string (YYYY-MM-DD or ISO) for display in en-AU locale. */
export function fmtDate(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-AU', opts)
}

/**
 * Converts a 24-hour time string "HH:MM" or "HH:MM:SS" to 12-hour format.
 * Returns empty string on null / undefined / unparseable input.
 */
export function fmt12(timeStr: string | null | undefined): string {
  if (!timeStr) return ''
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (isNaN(h) || isNaN(m)) return timeStr
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}
