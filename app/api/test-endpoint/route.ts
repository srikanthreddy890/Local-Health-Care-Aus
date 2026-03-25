import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rateLimit'
import dns from 'dns/promises'
import { isIP, isIPv4 } from 'net'

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })

/* ------------------------------------------------------------------ */
/*  SSRF protection helpers                                            */
/* ------------------------------------------------------------------ */

/** Check if an IPv4 address falls within private/reserved ranges. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true // malformed → block
  const [a, b] = parts
  return (
    a === 0 ||                          // 0.0.0.0/8
    a === 10 ||                         // 10.0.0.0/8
    a === 127 ||                        // 127.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) ||         // 192.168.0.0/16
    (a === 169 && b === 254)            // 169.254.0.0/16
  )
}

/** Check if an IPv6 address is private/reserved. */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true   // fc00::/7
  if (normalized.startsWith('fe80')) return true                                // fe80::/10
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1])
  return false
}

function isPrivateIP(ip: string): boolean {
  if (isIPv4(ip)) return isPrivateIPv4(ip)
  return isPrivateIPv6(ip)
}

/** Resolve hostname and check all IPs against private ranges. */
async function validateNotPrivate(hostname: string): Promise<void> {
  // If hostname is already a raw IP, check directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('Cannot access private/internal addresses')
    return
  }

  // Resolve DNS and check all returned addresses
  const ips: string[] = []
  try { ips.push(...await dns.resolve4(hostname)) } catch { /* no A records */ }
  try { ips.push(...await dns.resolve6(hostname)) } catch { /* no AAAA records */ }

  if (ips.length === 0) throw new Error('Could not resolve hostname')
  if (ips.some(isPrivateIP)) throw new Error('Cannot access private/internal addresses')
}

/* ------------------------------------------------------------------ */
/*  Header allowlist                                                   */
/* ------------------------------------------------------------------ */

/** Headers that must NOT be forwarded (could interfere with the proxy request itself) */
const BLOCKED_HEADERS = new Set([
  'host', 'origin', 'referer', 'cookie', 'set-cookie',
  'connection', 'transfer-encoding', 'keep-alive',
  'upgrade', 'proxy-authorization', 'proxy-connection',
])

function filterHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers || {})) {
    if (!BLOCKED_HEADERS.has(k.toLowerCase())) filtered[k] = v
  }
  return filtered
}

/* ------------------------------------------------------------------ */
/*  Response size limit                                                */
/* ------------------------------------------------------------------ */

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024 // 5 MB

async function readLimitedResponse(response: Response): Promise<string> {
  const contentLength = response.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    throw new Error('Response too large')
  }

  const reader = response.body?.getReader()
  if (!reader) return ''

  const decoder = new TextDecoder()
  let text = ''
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_RESPONSE_BYTES) {
      reader.cancel()
      throw new Error('Response too large')
    }
    text += decoder.decode(value, { stream: true })
  }
  text += decoder.decode() // flush
  return text
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

/**
 * Server-side proxy for testing custom API endpoints during wizard setup.
 * Avoids CORS issues by making the HTTP request from the server.
 * Auth: requires authenticated user.
 */
export async function POST(req: NextRequest) {
  // Verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { url, method, headers, urlParameters, doctorId, date, requestBody } = body as {
      url: string
      method: string
      headers: Record<string, string>
      urlParameters?: { name: string; paramLocation: string; type?: string; defaultValue?: string }[]
      doctorId?: string
      date?: string
      requestBody?: string
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // SSRF protection — validate protocol and resolved IPs
    const urlObj = new URL(url)
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http and https protocols are allowed' }, { status: 403 })
    }
    await validateNotPrivate(urlObj.hostname)

    // Request body size limit (1 MB)
    if (requestBody && requestBody.length > 1_048_576) {
      return NextResponse.json({ error: 'Request body too large (max 1MB)' }, { status: 413 })
    }

    // Build final URL with parameters
    let finalUrl = url
    if (urlParameters?.length) {
      const parsed = new URL(finalUrl)
      for (const param of urlParameters) {
        if (!param.name || !param.defaultValue) continue
        if (param.paramLocation === 'path') {
          if (finalUrl.includes(`{${param.name}}`)) {
            finalUrl = finalUrl.replace(`{${param.name}}`, encodeURIComponent(param.defaultValue))
          } else if (!parsed.searchParams.has(param.name)) {
            parsed.searchParams.set(param.name, param.defaultValue)
            finalUrl = parsed.toString()
          }
        } else {
          if (!parsed.searchParams.has(param.name)) {
            parsed.searchParams.set(param.name, param.defaultValue)
            finalUrl = parsed.toString()
          }
        }
      }
    }

    // Substitute doctor/date for appointment endpoints
    if (doctorId) {
      // Replace path placeholder
      finalUrl = finalUrl.replace('{doctorId}', encodeURIComponent(doctorId))
      // Also set as query param if configured
      const u = new URL(finalUrl)
      if (!u.searchParams.has('doctorId') && !u.searchParams.has('doctor_id')) {
        // Check if any urlParameter references doctorId
        const hasDoctorParam = urlParameters?.some((p) =>
          p.name === 'doctorId' || p.name === 'doctor_id'
        )
        if (hasDoctorParam) {
          u.searchParams.set(
            urlParameters!.find((p) => p.name === 'doctorId' || p.name === 'doctor_id')!.name,
            doctorId
          )
          finalUrl = u.toString()
        }
      }
    }
    if (date) {
      const u = new URL(finalUrl)
      // For datetime params (start/end), generate datetime strings from the date
      const hasStart = urlParameters?.some((p) => p.name === 'start' || p.name === 'startDate' || p.name === 'start_date')
      const hasEnd = urlParameters?.some((p) => p.name === 'end' || p.name === 'endDate' || p.name === 'end_date')

      if (hasStart) {
        const startParam = urlParameters!.find((p) => p.name === 'start' || p.name === 'startDate' || p.name === 'start_date')!
        const startValue = startParam.type === 'datetime'
          ? `${date} 00:00:00`
          : date
        if (!u.searchParams.has(startParam.name)) {
          u.searchParams.set(startParam.name, startValue)
        }
        finalUrl = u.toString()
      }
      if (hasEnd) {
        const u2 = new URL(finalUrl)
        const endParam = urlParameters!.find((p) => p.name === 'end' || p.name === 'endDate' || p.name === 'end_date')!
        const endValue = endParam.type === 'datetime'
          ? `${date} 23:59:59`
          : date
        if (!u2.searchParams.has(endParam.name)) {
          u2.searchParams.set(endParam.name, endValue)
        }
        finalUrl = u2.toString()
      }
      // Fallback: add date as generic param if no start/end configured
      if (!hasStart && !hasEnd) {
        if (!u.searchParams.has('date') && !u.searchParams.has('start_date')) {
          u.searchParams.set('date', date)
          finalUrl = u.toString()
        }
      }
    }

    // Log what we're actually sending — fully redact sensitive headers
    console.log('[test-endpoint] Request:', {
      url: finalUrl,
      method: method || 'GET',
      headers: Object.fromEntries(
        Object.entries(headers || {}).map(([k, v]) => [
          k,
          k.toLowerCase().includes('key') || k.toLowerCase().includes('token') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('api')
            ? '****'
            : v,
        ])
      ),
    })

    // For POST/PUT, add Content-Type and body
    const isPostLike = (method || 'GET').toUpperCase() === 'POST' || (method || 'GET').toUpperCase() === 'PUT'
    const finalHeaders = filterHeaders(headers)
    if (isPostLike && !finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
      finalHeaders['Content-Type'] = 'application/json'
    }

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: finalHeaders,
      signal: AbortSignal.timeout(15000),
    }
    if (isPostLike && requestBody) {
      fetchOptions.body = requestBody
    } else if (isPostLike) {
      // Send empty JSON body if no request body configured
      fetchOptions.body = '{}'
    }

    // Make the request server-side (no CORS restrictions)
    const response = await fetch(finalUrl, fetchOptions)

    const responseText = await readLimitedResponse(response)
    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { _rawText: responseText }
    }

    console.log('[test-endpoint] Response:', response.status, response.statusText)

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      _debug: {
        requestUrl: finalUrl,
        requestHeaders: Object.keys(headers || {}),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
