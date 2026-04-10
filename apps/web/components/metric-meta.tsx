'use client';

/**
 * MetricMeta — small inline metadata block rendered beside or under an
 * accuracy/win-rate/confidence number. Shows:
 *   n=<sampleSize>  ·  <openCount> open  ·  updated <relative>
 *
 * All values are driven by real counts — callers pass nothing hardcoded.
 */

interface MetricMetaProps {
  /** Total recorded outcomes used to compute the parent metric. */
  sampleSize: number;
  /** Number of trades currently running (not yet resolved). */
  openCount?: number;
  /** Most recent outcome / record timestamp (ms epoch). */
  lastUpdated?: number | null;
  /** Optional label override for the sample-size term. */
  sampleLabel?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function MetricMeta({
  sampleSize,
  openCount,
  lastUpdated,
  sampleLabel = 'n',
  className = '',
  align = 'left',
}: MetricMetaProps) {
  const alignCls =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  const parts: string[] = [];
  parts.push(`${sampleLabel}=${sampleSize.toLocaleString()}`);
  if (typeof openCount === 'number') parts.push(`${openCount} open`);
  if (lastUpdated && Number.isFinite(lastUpdated)) {
    parts.push(`updated ${formatRelative(lastUpdated)}`);
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 ${alignCls} ${className}`}
      title={
        lastUpdated && Number.isFinite(lastUpdated)
          ? `Last outcome: ${new Date(lastUpdated).toLocaleString()}`
          : undefined
      }
    >
      {parts.map((p, i) => (
        <span key={i} className="tabular-nums">
          {i > 0 && <span className="text-zinc-700 mr-2">·</span>}
          {p}
        </span>
      ))}
    </div>
  );
}
