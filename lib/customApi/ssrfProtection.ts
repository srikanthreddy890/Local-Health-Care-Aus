import dns from 'dns/promises'
import { isIP, isIPv4 } from 'net'

/**
 * SSRF protection utilities.
 * Prevents API proxy from targeting internal/private network addresses.
 *
 * Used by: test-endpoint, clinic/sync-doctors. Edge Functions have their own Deno-compatible copy.
 */

/** Check if an IPv4 address falls within private/reserved ranges. */
export function isPrivateIPv4(ip: string): boolean {
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
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim()
  if (normalized === '::1' || normalized === '::') return true                  // loopback & unspecified
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true   // fc00::/7 unique local
  if (normalized.startsWith('fe80')) return true                                // fe80::/10 link-local
  if (normalized.startsWith('ff')) return true                                  // ff00::/8 multicast
  if (normalized.startsWith('100:') && normalized.includes('::')) return true   // 100::/64 discard
  // IPv4-mapped IPv6 — multiple formats: ::ffff:x.x.x.x and ::ffff:hex:hex
  const v4Mapped = normalized.match(/^(?:0*:)*:?(?:0*:)*ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1])
  // IPv4-compatible IPv6 (deprecated but still possible): ::x.x.x.x
  const v4Compat = normalized.match(/^(?:0*:)*:(\d+\.\d+\.\d+\.\d+)$/)
  if (v4Compat) return isPrivateIPv4(v4Compat[1])
  return false
}

export function isPrivateIP(ip: string): boolean {
  if (isIPv4(ip)) return isPrivateIPv4(ip)
  return isPrivateIPv6(ip)
}

/**
 * Resolve hostname, check all IPs against private ranges, and return resolved IPs.
 * Callers should fetch by resolved IP (with Host header) to prevent DNS rebinding.
 */
export async function validateNotPrivate(hostname: string): Promise<string[]> {
  // If hostname is already a raw IP, check directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('Cannot access private/internal addresses')
    return [hostname]
  }

  // Resolve DNS and check all returned addresses
  const ips: string[] = []
  try { ips.push(...await dns.resolve4(hostname)) } catch { /* no A records */ }
  try { ips.push(...await dns.resolve6(hostname)) } catch { /* no AAAA records */ }

  if (ips.length === 0) throw new Error('Could not resolve hostname')
  if (ips.some(isPrivateIP)) throw new Error('Cannot access private/internal addresses')
  return ips
}
