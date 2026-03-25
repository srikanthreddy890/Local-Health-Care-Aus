/**
 * In-memory rate limiter with automatic cleanup of expired entries.
 *
 * Usage:
 *   const limiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000 })
 *   if (!limiter.check(userId)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterOptions {
  /** Maximum requests allowed within the window. */
  maxRequests: number
  /** Time window in milliseconds. */
  windowMs: number
  /** How often to purge expired entries (ms). Defaults to 5 minutes. */
  cleanupIntervalMs?: number
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { maxRequests, windowMs, cleanupIntervalMs = 5 * 60_000 } = options
  const map = new Map<string, RateLimitEntry>()

  // Periodic cleanup to prevent unbounded Map growth
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of map) {
      if (now >= entry.resetAt) map.delete(key)
    }
  }, cleanupIntervalMs)

  // Allow GC if the module is unloaded (e.g. hot-reload in dev)
  if (cleanup.unref) cleanup.unref()

  return {
    /**
     * Returns `true` if the request is allowed, `false` if rate-limited.
     */
    check(key: string): boolean {
      const now = Date.now()
      const entry = map.get(key)

      if (!entry || now >= entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return true
      }

      if (entry.count >= maxRequests) return false
      entry.count++
      return true
    },
  }
}
