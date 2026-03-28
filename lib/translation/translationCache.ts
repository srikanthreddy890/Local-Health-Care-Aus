const CACHE_KEY = 'lhc-translations-v1'
const MAX_CACHE_BYTES = 2 * 1024 * 1024 // 2 MB

type LangCache = Record<string, string>
type FullCache = Record<string, LangCache>

/** Read the full cache object from localStorage. */
function readCache(): FullCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** Write the full cache object to localStorage. */
function writeCache(cache: FullCache) {
  try {
    const json = JSON.stringify(cache)
    // Evict oldest language if over budget
    if (json.length > MAX_CACHE_BYTES) {
      const langs = Object.keys(cache)
      if (langs.length > 0) {
        delete cache[langs[0]]
        writeCache(cache) // retry after eviction
        return
      }
    }
    localStorage.setItem(CACHE_KEY, json)
  } catch {
    // localStorage full — clear and retry once
    try {
      localStorage.removeItem(CACHE_KEY)
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
    } catch {}
  }
}

/** Get cached translations for a language. */
export function getCachedTranslations(langCode: string): LangCache {
  return readCache()[langCode] ?? {}
}

/** Merge new translations into the cache for a language. */
export function setCachedTranslations(langCode: string, entries: Record<string, string>) {
  const cache = readCache()
  cache[langCode] = { ...(cache[langCode] ?? {}), ...entries }
  writeCache(cache)
}

/** Clear cache for one language or all. */
export function clearTranslationCache(langCode?: string) {
  if (langCode) {
    const cache = readCache()
    delete cache[langCode]
    writeCache(cache)
  } else {
    try { localStorage.removeItem(CACHE_KEY) } catch {}
  }
}
