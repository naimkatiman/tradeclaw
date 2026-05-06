import 'server-only';

/**
 * Validate that a user-supplied URL is safe to fetch from the server.
 *
 * Mitigates SSRF: Discord webhook URL and the generic webhook URL come from
 * untrusted user config. Without this gate, an attacker could store
 * `http://169.254.169.254/latest/meta-data/iam/security-credentials/...`
 * (AWS IMDS) or any internal service URL and the server would dutifully
 * GET/POST it, returning the response or its side effects to the attacker.
 *
 * Rules:
 *   - Only HTTPS (no http://, no file:, no ftp:, no data:, etc.)
 *   - Reject hostnames that are loopback / private / link-local
 *   - Reject explicit IPv4 literals in private/reserved ranges
 *   - Reject explicit IPv6 literals (::1, fc00::/7, fe80::/10)
 *   - Reject known cloud-metadata hosts
 *
 * NOT mitigated here: DNS rebinding (an attacker DNS-resolved-allowed host
 * can flip to 169.254.169.254 between this check and the fetch). For
 * defense-in-depth, callers should additionally enforce a per-call timeout
 * and reject redirects to internal addresses.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.azure.com',
  'metadata.azure.internal',
  'kubernetes.default.svc',
  'kubernetes.default.svc.cluster.local',
]);

function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;         // 169.254.0.0/16 link-local + AWS IMDS
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;         // 192.168.0.0/16
  if (a === 0) return true;                        // 0.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT
  if (a >= 224) return true;                       // 224.0.0.0/4 multicast + reserved
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const lower = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local fc00::/7
  // ::ffff:127.0.0.1 etc — reject IPv4-mapped IPv6 to private addresses
  const v4Mapped = lower.match(/^::ffff:([0-9.]+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

export interface SafeUrlError {
  reason: 'parse' | 'protocol' | 'host_empty' | 'host_blocked' | 'ip_private';
  detail?: string;
}

export function checkSafeOutboundUrl(raw: string): SafeUrlError | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { reason: 'parse' };
  }
  if (parsed.protocol !== 'https:') {
    return { reason: 'protocol', detail: parsed.protocol };
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) return { reason: 'host_empty' };
  if (BLOCKED_HOSTS.has(host)) return { reason: 'host_blocked', detail: host };

  if (isPrivateIPv4(host)) return { reason: 'ip_private', detail: host };
  if (host.includes(':')) {
    if (isPrivateIPv6(host)) return { reason: 'ip_private', detail: host };
  }
  // Non-hostname suffix wildcards we never want to allow
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return { reason: 'host_blocked', detail: host };
  }
  return null;
}

export function isSafeOutboundUrl(raw: string): boolean {
  return checkSafeOutboundUrl(raw) === null;
}

export function assertSafeOutboundUrl(raw: string): void {
  const err = checkSafeOutboundUrl(raw);
  if (err) {
    throw new Error(`unsafe_outbound_url:${err.reason}${err.detail ? `:${err.detail}` : ''}`);
  }
}
