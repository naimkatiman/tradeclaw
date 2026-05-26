import { NextRequest, NextResponse } from 'next/server';
import { getTrackedSignalsForRequest } from '../../../lib/tracked-signals';
import { SYMBOLS } from '../../lib/signals';

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
        name: 'tradeclaw_scrape_timestamp_seconds',
        help: 'Unix timestamp (seconds) when these metrics were generated',
        type: 'gauge',
        samples: [{ labels: {}, value: Math.floor(Date.now() / 1000) }],
      },
    ];

    return new NextResponse(formatLines(lines), {
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
