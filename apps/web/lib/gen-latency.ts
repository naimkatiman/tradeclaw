import 'server-only';

/**
 * In-process histogram for signal-generation latency (seconds).
 *
 * Module-level cumulative bucket counters; per-instance and reset on restart.
 * Instrumented around the cron precompute boundary (signal-worker.ts), which is
 * the real generation path — `getSignals({ skipCache: true })` forces a fresh
 * TA run rather than serving cached results. The per-request fetch path is
 * deliberately NOT instrumented here so the metric stays a true "generation"
 * latency rather than a mix of generate-and-serve timings.
 */

const BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10] as const;

const bucketCounts = new Map<number, number>(BUCKETS.map((b) => [b, 0]));
let sum = 0;
let count = 0;

export function observeSignalGenDuration(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  sum += seconds;
  count += 1;
  // Prometheus histogram buckets are cumulative (le = less-than-or-equal).
  for (const b of BUCKETS) {
    if (seconds <= b) bucketCounts.set(b, (bucketCounts.get(b) ?? 0) + 1);
  }
}

const METRIC = 'tradeclaw_signal_gen_duration_seconds';

/** Render the histogram as Prometheus exposition text (HELP/TYPE + samples). */
export function renderGenLatencyHistogram(): string {
  const out: string[] = [
    `# HELP ${METRIC} Signal generation latency in seconds (cron precompute path). Per-instance, resets on restart.`,
    `# TYPE ${METRIC} histogram`,
  ];
  for (const b of BUCKETS) {
    out.push(`${METRIC}_bucket{le="${b}"} ${bucketCounts.get(b) ?? 0}`);
  }
  out.push(`${METRIC}_bucket{le="+Inf"} ${count}`);
  out.push(`${METRIC}_sum ${sum}`);
  out.push(`${METRIC}_count ${count}`);
  out.push('');
  return out.join('\n');
}
