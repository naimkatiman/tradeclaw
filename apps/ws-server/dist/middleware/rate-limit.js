const CONNECTION_WINDOW_MS = 60_000;
const MAX_CONNECTIONS_PER_IP = 5;
const MAX_MESSAGES_PER_SECOND = 10;
// Connection rate limiting (per IP)
const connectionCounts = new Map();
export function checkConnectionRate(ip) {
    const now = Date.now();
    const entry = connectionCounts.get(ip);
    if (!entry || now > entry.resetAt) {
        connectionCounts.set(ip, { count: 1, resetAt: now + CONNECTION_WINDOW_MS });
        return true;
    }
    entry.count++;
    return entry.count <= MAX_CONNECTIONS_PER_IP;
}
// Message rate limiting (per client)
export class MessageRateLimiter {
    counts = new Map();
    check(clientId) {
        const now = Date.now();
        const entry = this.counts.get(clientId);
        if (!entry || now > entry.resetAt) {
            this.counts.set(clientId, { count: 1, resetAt: now + 1_000 });
            return true;
        }
        entry.count++;
        return entry.count <= MAX_MESSAGES_PER_SECOND;
    }
    remove(clientId) {
        this.counts.delete(clientId);
    }
}
// Cleanup stale entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of connectionCounts) {
        if (now > entry.resetAt)
            connectionCounts.delete(ip);
    }
}, 60_000);
//# sourceMappingURL=rate-limit.js.map