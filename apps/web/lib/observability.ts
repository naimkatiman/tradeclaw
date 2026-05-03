import 'server-only';

/**
 * Pluggable observability shim.
 *
 * Today: writes structured records to console. Tomorrow: pipe to Sentry,
 * Datadog, or any provider — call sites stay unchanged.
 *
 * The Pro Telegram broadcast and the alert-rules dispatcher silently
 * swallowed failures (a Telegram outage or a 500 from a user's webhook
 * looked exactly like a healthy run from the outside). Operators had no
 * way to know delivery had stopped. This shim gives both code paths a
 * single function to call when they record success/failure counts, with
 * an enrichment hook that fires only when SENTRY_DSN is configured.
 *
 * Hook contract: when SENTRY_DSN is set, `forwardToSentry` is invoked
 * with the record. It is a no-op stub today (we have no Sentry SDK
 * dependency in apps/web). When the SDK lands, swap the body for
 * `Sentry.addBreadcrumb` / `Sentry.captureMessage` without touching any
 * call site.
 */

export type ObservabilitySeverity = 'info' | 'warning' | 'error';

export interface BroadcastRecord {
  source: 'telegram_pro_broadcast' | 'alert_rules_dispatch' | 'telegram_free_broadcast';
  attempted: number;
  sent: number;
  failed: number;
  reason?: string;
  /** Free-form enrichment — channel name, user-id buckets, etc. */
  meta?: Record<string, unknown>;
}

function severityFor(record: BroadcastRecord): ObservabilitySeverity {
  if (record.attempted === 0) return 'info';
  if (record.failed === 0) return 'info';
  if (record.sent === 0) return 'error';
  return 'warning';
}

function isSentryWired(): boolean {
  return !!process.env.SENTRY_DSN;
}

// Stub. Swap body to `Sentry.addBreadcrumb(...)` / `Sentry.captureMessage(...)`
// once the SDK is installed. Kept as a private function so call sites do not
// need to change.
function forwardToSentry(_record: BroadcastRecord, _severity: ObservabilitySeverity): void {
  // Intentionally empty until @sentry/nextjs is added to apps/web/package.json.
  // Surfaced as a separate concern so this commit does not pull in a paid
  // SaaS dep without explicit user authorization.
}

/**
 * Record the outcome of a fan-out batch. Always console-logs at the
 * appropriate severity. Forwards to Sentry when SENTRY_DSN is set.
 *
 * Never throws — observability must not break the calling path.
 */
export function recordBroadcastResult(record: BroadcastRecord): void {
  try {
    const severity = severityFor(record);
    const line = JSON.stringify({
      kind: 'broadcast_result',
      severity,
      ...record,
      ts: new Date().toISOString(),
    });

    if (severity === 'error') console.error(line);
    else if (severity === 'warning') console.warn(line);
    else console.log(line);

    if (isSentryWired()) forwardToSentry(record, severity);
  } catch {
    // Never throw from observability.
  }
}
