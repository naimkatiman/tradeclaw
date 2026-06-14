import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { getSymbolBreakdown, getOperatorMemoryCount } from '../../../lib/signal-metrics';
import { SYMBOLS } from '../../lib/signals';
import { snapshotDeliveries } from '../../../lib/delivery-metrics';
import { renderGenLatencyHistogram } from '../../../lib/gen-latency';

export const dynamic = 'force-dynamic';

/**
 * Prometheus-compatible metrics endpoint.
 *
 * Exposes current signal values, confidence scores, and basic counters in
 * the Prometheus text exposition format. Designed to be scraped by a
 * Prometheus server and visualized with the pre-built Grafana dashboard at
 * grafana/tradeclaw-dashboard.json.
 *
 * Example scrape config:
 *   - job_name: 'tradeclaw'
 *     metrics_path: '/api/metrics'
 *     static_configs:
 *       - targets: ['localhost:3000']
 */

interface Line {
  name: string;
  help: string;
  type: 'gauge' | 'counter';
  samples: Array<{ labels: Record<string, string>; value: number }>;
}

function formatLines(lines: Line[]): string {
  const out: string[] = [];
  for (const line of lines) {
    out.push(`# HELP ${line.name} ${line.help}`);
    out.push(`# TYPE ${line.name} ${line.type}`);
    for (const sample of line.samples) {
      const labelStr = Object.entries(sample.labels)
        .map(([k, v]) => `${k}="${String(v).replace(/[\\"\n]/g, '_')}"`)
        .join(',');
      out.push(`${line.name}{${labelStr}} ${sample.value}`);
    }
    out.push('');
  }
  return out.join('\n');
}

function directionToValue(direction: string): number {
  if (direction === 'BUY') return 1;
  if (direction === 'SELL') return -1;
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('tf') || 'H1';

    const { signals } = await getTrackedSignalsForRequest(request, { timeframe });

    const signalValueSamples: Line['samples'] = [];
    const confidenceSamples: Line['samples'] = [];
    const rsiSamples: Line['samples'] = [];
    let buyCount = 0;
    let sellCount = 0;

    for (const sig of signals) {
      const labels = { symbol: sig.symbol, timeframe: sig.timeframe };
      signalValueSamples.push({ labels, value: directionToValue(sig.direction) });
      confidenceSamples.push({ labels, value: sig.confidence });
      if (sig.indicators?.rsi?.value != null) {
        rsiSamples.push({ labels, value: sig.indicators.rsi.value });
      }
      if (sig.direction === 'BUY') buyCount++;
      else if (sig.direction === 'SELL') sellCount++;
    }

    // Signal freshness: seconds since the most recent signal per symbol.
    // Derived from the live signals already loaded above — no extra DB hit.
    const lastTsBySymbol = new Map<string, number>();
    for (const sig of signals) {
      const ts = typeof sig.timestamp === 'number' ? sig.timestamp : Date.parse(String(sig.timestamp));
      if (!Number.isFinite(ts)) continue;
      const prev = lastTsBySymbol.get(sig.symbol);
      if (prev == null || ts > prev) lastTsBySymbol.set(sig.symbol, ts);
    }
    const nowMs = Date.now();
    const ageSamples: Line['samples'] = [];
    for (const [symbol, ts] of lastTsBySymbol) {
      ageSamples.push({ labels: { symbol }, value: Math.max(0, Math.floor((nowMs - ts) / 1000)) });
    }

    // Outcome counts from resolved signal history (best-effort, 30-day window).
    // Zero-initialized across all symbols so a missing series never breaks
    // sum()/rate() in Grafana. Degrades gracefully if the DB is unavailable.
    const outcomesSamples: Line['samples'] = [];
    try {
      const breakdown = await getSymbolBreakdown(30);
      const bySymbol = new Map(breakdown.map((b) => [b.symbol, b]));
      for (const s of SYMBOLS) {
        const row = bySymbol.get(s.symbol);
        const hit = row?.wins24h ?? 0;
        const sl = row?.losses24h ?? 0;
        const open = row ? Math.max(0, row.totalSignals - hit - sl) : 0;
        outcomesSamples.push(
          { labels: { symbol: s.symbol, result: 'hit' }, value: hit },
          { labels: { symbol: s.symbol, result: 'sl' }, value: sl },
          { labels: { symbol: s.symbol, result: 'open' }, value: open },
        );
      }
    } catch {
      for (const s of SYMBOLS) {
        outcomesSamples.push(
          { labels: { symbol: s.symbol, result: 'hit' }, value: 0 },
          { labels: { symbol: s.symbol, result: 'sl' }, value: 0 },
          { labels: { symbol: s.symbol, result: 'open' }, value: 0 },
        );
      }
    }

    // Operator-memory entry count (best-effort; zero on DB failure).
    let operatorMemoryCount = 0;
    try {
      operatorMemoryCount = await getOperatorMemoryCount();
    } catch {
      operatorMemoryCount = 0;
    }

    // Delivery counters (in-process; per-instance, reset on restart).
    const deliverySamples = snapshotDeliveries();

    const lines: Line[] = [
      {
        name: 'tradeclaw_signal_value',
        help: 'Current signal direction (1=BUY, 0=HOLD/NEUTRAL, -1=SELL)',
        type: 'gauge',
        samples: signalValueSamples,
      },
      {
        name: 'tradeclaw_signal_confidence',
        help: 'Signal confidence score (0-100)',
        type: 'gauge',
        samples: confidenceSamples,
      },
      {
        name: 'tradeclaw_signal_rsi',
        help: 'RSI(14) value per symbol at scoring time',
        type: 'gauge',
        samples: rsiSamples,
      },
      {
        name: 'tradeclaw_signals_total',
        help: 'Total number of active signals by direction',
        type: 'gauge',
        samples: [
          { labels: { direction: 'BUY' }, value: buyCount },
          { labels: { direction: 'SELL' }, value: sellCount },
        ],
      },
      {
        name: 'tradeclaw_symbols_tracked',
        help: 'Total number of symbols tracked by the engine',
        type: 'gauge',
        samples: [{ labels: {}, value: SYMBOLS.length }],
      },
      {
        name: 'tradeclaw_signal_outcomes_total',
        help: 'Resolved signal outcomes per symbol over the last 30 days (hit=TP reached, sl=stop hit, open=unresolved)',
        type: 'gauge',
        samples: outcomesSamples,
      },
      {
        name: 'tradeclaw_signal_age_seconds',
        help: 'Seconds since the most recent signal per symbol (freshness: <300 fresh, 300-900 warning, >900 stale)',
        type: 'gauge',
        samples: ageSamples,
      },
      {
        name: 'tradeclaw_webhook_delivery_total',
        help: 'Alert/webhook delivery attempts by channel and outcome (in-process, per-instance, resets on restart)',
        type: 'counter',
        samples: deliverySamples,
      },
      {
        name: 'tradeclaw_operator_memory_entries',
        help: 'Total operator-memory rows (per user_id+key) in storage',
        type: 'gauge',
        samples: [{ labels: {}, value: operatorMemoryCount }],
      },
      {
        name: 'tradeclaw_scrape_timestamp_seconds',
        help: 'Unix timestamp (seconds) when these metrics were generated',
        type: 'gauge',
        samples: [{ labels: {}, value: Math.floor(Date.now() / 1000) }],
      },
    ];

    return new NextResponse(formatLines(lines) + renderGenLatencyHistogram(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const errorLine = formatLines([
      {
        name: 'tradeclaw_up',
        help: 'Whether the TradeClaw metrics endpoint is healthy (1=up, 0=down)',
        type: 'gauge',
        samples: [{ labels: {}, value: 0 }],
      },
    ]);
    return new NextResponse(errorLine + `\n# ${err instanceof Error ? err.message : 'error'}\n`, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  }
}
