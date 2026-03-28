import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rateLimit'

const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get'
const MAX_TEXTS = 50
const MAX_CHARS = 500
const CONCURRENCY = 10

const limiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000 })

/* Language code mapping — MyMemory uses IETF codes */
const LANG_MAP: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'hi': 'hi',
  'id': 'id',
  'th': 'th',
  'it': 'it',
  'es': 'es',
}

interface TranslateRequest {
  texts: string[]
  source?: string
  target: string
}

/** Translate a single string via MyMemory. */
async function translateOne(text: string, source: string, target: string): Promise<string> {
  const langPair = `${source}|${target}`
  const url = new URL(MYMEMORY_BASE)
  url.searchParams.set('q', text)
  url.searchParams.set('langpair', langPair)

  // Optional: registered email bumps free quota from 5K to 50K chars/day
  if (process.env.MYMEMORY_EMAIL) {
    url.searchParams.set('de', process.env.MYMEMORY_EMAIL)
  }

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`MyMemory returned ${res.status}`)

  const data = await res.json()
  const translated = data?.responseData?.translatedText
  if (!translated) throw new Error('No translation in response')

  return translated
}

/** Run promises with limited concurrency. */
async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let idx = 0

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() }
      } catch (reason: any) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()))
  return results
}

const VALID_SOURCES = new Set(['en', ...Object.keys(LANG_MAP)])

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    if (!limiter.check(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = (await req.json()) as TranslateRequest
    const { texts, source = 'en', target } = body

    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: 'Invalid source language' }, { status: 400 })
    }
    if (!target || !LANG_MAP[target]) {
      return NextResponse.json({ error: 'Invalid target language' }, { status: 400 })
    }
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_TEXTS) {
      return NextResponse.json({ error: `texts must be an array of 1-${MAX_TEXTS} strings` }, { status: 400 })
    }

    const mappedTarget = LANG_MAP[target]

    const tasks = texts.map((text) => () => {
      const trimmed = typeof text === 'string' ? text.slice(0, MAX_CHARS) : ''
      if (!trimmed) return Promise.resolve('')
      return translateOne(trimmed, source, mappedTarget)
    })

    const results = await withConcurrency(tasks, CONCURRENCY)

    const translations = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : texts[i] // fallback to original on failure
    )

    return NextResponse.json({ translations })
  } catch (err: any) {
    console.error('[translate] Error:', err?.message)
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 })
  }
}
