/**
 * In-memory LRU cache for API configurations.
 *
 * API configs rarely change but are fetched on every proxy call.
 * This cache eliminates redundant Supabase RPC calls during batch
 * operations where the same config is needed for every doctor.
 *
 * TTL: 60 seconds — short enough to pick up config changes quickly,
 * long enough to deduplicate within a single batch request.
 *
 * This runs in the Next.js server process (Node.js) so the cache
 * is shared across requests within the same serverless invocation.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const CONFIG_TTL_MS = 60_000 // 60 seconds
const MAX_ENTRIES = 50

const cache = new Map<string, CacheEntry<Record<string, unknown>>>()

export function getCachedConfig(configId: string): Record<string, unknown> | null {
  const entry = cache.get(configId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(configId)
    return null
  }
  return entry.value
}

export function setCachedConfig(configId: string, config: Record<string, unknown>): void {
  // Evict oldest entries if over capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(configId, {
    value: config,
    expiresAt: Date.now() + CONFIG_TTL_MS,
  })
}

/** Fetch config with cache-aside pattern. */
export async function getConfigCached(
  configId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Record<string, unknown> | null> {
  const cached = getCachedConfig(configId)
  if (cached) return cached

  const { data, error } = await supabase.rpc('get_active_api_config', { p_config_id: configId })
  if (error || !data) return null

  const config = data as Record<string, unknown>
  setCachedConfig(configId, config)
  return config
}
