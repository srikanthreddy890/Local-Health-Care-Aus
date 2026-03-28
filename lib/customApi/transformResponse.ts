/**
 * Response transformation utilities for the custom API integration.
 * Extracted from custom-api-proxy for reuse in sync jobs and proxy.
 */

/** Navigate a nested object using a dot-separated path. */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/**
 * Transform API response using field mappings.
 * Finds the array in the response, maps each item's fields to standard names.
 */
export function transformResponse(
  data: Record<string, unknown>,
  mappings: Record<string, string>,
): Record<string, unknown> {
  const arrayKeys = ['doctors', 'appointments', 'slots', 'data', 'results', 'items']
  let items: Record<string, unknown>[] | null = null

  if (Array.isArray(data)) {
    items = data as Record<string, unknown>[]
  } else {
    // Check for array path in mappings
    for (const key of arrayKeys) {
      if (mappings[key]) {
        items = getValueByPath(data, mappings[key]) as Record<string, unknown>[] | null
        if (Array.isArray(items)) break
        items = null
      }
    }
    // Auto-detect array
    if (!items) {
      for (const key of arrayKeys) {
        if (Array.isArray(data[key])) {
          items = data[key] as Record<string, unknown>[]
          break
        }
      }
    }
  }

  if (!items) {
    return data // Return as-is if no array found
  }

  // Map each item's fields
  const mapped = items.map((item) => {
    const result: Record<string, unknown> = {}
    for (const [standardKey, externalPath] of Object.entries(mappings)) {
      if (arrayKeys.includes(standardKey)) continue // Skip array path keys
      if (externalPath.startsWith('@request.')) continue // Skip request context mappings
      const value = getValueByPath(item, externalPath)
      if (value !== undefined) result[standardKey] = value
    }
    // Also keep the original item data for unmapped fields
    return { ...item, ...result }
  })

  return { data: mapped }
}

/**
 * Normalize API response into an array. Handles both direct arrays and wrapped
 * objects like { doctors: [...] } or { data: { slots: [...] } }.
 */
export function normalizeArray(
  result: Record<string, unknown>,
  possibleKeys: string[],
): Record<string, unknown>[] {
  // Direct array
  if (Array.isArray(result)) return result

  // Check nested keys: result.data.X or result.X
  for (const key of possibleKeys) {
    const val = result[key]
    if (Array.isArray(val)) return val

    // One level deeper (result.data.key)
    if (typeof result.data === 'object' && result.data !== null) {
      const nested = (result.data as Record<string, unknown>)[key]
      if (Array.isArray(nested)) return nested
    }
  }

  // If result.data is itself an array
  if (Array.isArray(result.data)) return result.data

  return []
}
