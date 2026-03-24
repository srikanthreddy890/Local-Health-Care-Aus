import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  try {
    const body = await req.json()
    const { url, method, headers, urlParameters, doctorId, date } = body as {
      url: string
      method: string
      headers: Record<string, string>
      urlParameters?: { name: string; paramLocation: string; defaultValue?: string }[]
      doctorId?: string
      date?: string
    }

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // SSRF protection — block private/loopback IPs
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const blockedPatterns = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1',
      '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
      '172.30.', '172.31.', '192.168.', '169.254.',
    ]
    if (blockedPatterns.some((p) => hostname === p || hostname.startsWith(p))) {
      return NextResponse.json({ error: 'Cannot access private/internal addresses' }, { status: 403 })
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
      finalUrl = finalUrl.replace('{doctorId}', encodeURIComponent(doctorId))
    }
    if (date) {
      const u = new URL(finalUrl)
      if (!u.searchParams.has('date') && !u.searchParams.has('start_date')) {
        u.searchParams.set('date', date)
        finalUrl = u.toString()
      }
    }

    // Make the request server-side (no CORS restrictions)
    const response = await fetch(finalUrl, {
      method: method || 'GET',
      headers: headers || {},
      signal: AbortSignal.timeout(15000),
    })

    const responseText = await response.text()
    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { _rawText: responseText }
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
