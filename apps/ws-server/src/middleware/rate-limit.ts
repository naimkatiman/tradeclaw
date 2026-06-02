const MAX_CONNECTIONS_PER_IP = 5;
const MAX_MESSAGES_PER_SECOND = 10;

// Concurrent connection limiting (per IP). Tracks the number of live, open
// connections per IP rather than connection attempts in a fixed window — a
// reconnecting client or NAT'd users behind one IP are not penalised, and the
// count reflects real concurrency. acquireConnection on connect,
// releaseConnection on close/error.
// NOTE: request.ip is the socket peer address. Proxy-aware client-IP
// resolution (Fastify trustProxy) is a separate concern handled in server.ts.
const connectionCounts: Map<string, number> = new Map();

// Increments the per-IP concurrent count if under the cap. Returns true when
// the connection is allowed (count incremented), false when over the cap (count
// left unchanged).
export function acquireConnection(ip: string): boolean {
  const current = connectionCounts.get(ip) ?? 0;
  if (current >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }
  connectionCounts.set(ip, current + 1);
  return true;
}

// Decrements the per-IP concurrent count, never below 0. Drops the entry once
// it hits 0 so the map doesn't grow unbounded.
export function releaseConnection(ip: string): void {
  const current = connectionCounts.get(ip) ?? 0;
  const next = current - 1;
  if (next <= 0) {
    connectionCounts.delete(ip);
  } else {
    connectionCounts.set(ip, next);
  }
}

// Message rate limiting (per client)
export class MessageRateLimiter {
  private counts: Map<string, { count: number; resetAt: number }> = new Map();

  check(clientId: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(clientId);

    if (!entry || now > entry.resetAt) {
      this.counts.set(clientId, { count: 1, resetAt: now + 1_000 });
      return true;
    }

    entry.count++;
    return entry.count <= MAX_MESSAGES_PER_SECOND;
  }

  remove(clientId: string): void {
    this.counts.delete(clientId);
  }
}
