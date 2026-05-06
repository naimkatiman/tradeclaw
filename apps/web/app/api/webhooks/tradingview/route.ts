import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { execute } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeSecretEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Strategy IDs that may flow in via the TradingView webhook pipe. Used as an
 * allowlist for incoming Pine-Script alerts. Add a new id here when wiring a
 * new TV strategy alert.
 */
const TV_STRATEGIES: ReadonlySet<string> = new Set([
  'tv-zaky-classic',
  'tv-hafiz-synergy',
  'tv-impulse-hunter',
]);

interface WebhookPayload {
  source_id: string;
  strategy_id: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence?: number;
  entry: number;
  stop_loss?: number;
  take_profit_1?: number;
  take_profit_2?: number;
  signal_ts: string;
}

function isString(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function validate(body: unknown): { ok: true; data: WebhookPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'body_not_object' };
  const b = body as Record<string, unknown>;

  if (!isString(b.source_id, 128)) return { ok: false, error: 'source_id' };
  if (!isString(b.strategy_id, 64)) return { ok: false, error: 'strategy_id' };
  if (!TV_STRATEGIES.has(b.strategy_id)) return { ok: false, error: 'strategy_id_not_allowed' };
  if (!isString(b.symbol, 32)) return { ok: false, error: 'symbol' };
  if (!isString(b.timeframe, 8)) return { ok: false, error: 'timeframe' };
  if (b.direction !== 'BUY' && b.direction !== 'SELL') return { ok: false, error: 'direction' };
  if (!isNumber(b.entry) || b.entry <= 0) return { ok: false, error: 'entry' };
  if (!isString(b.signal_ts, 64)) return { ok: false, error: 'signal_ts' };
  if (Number.isNaN(Date.parse(b.signal_ts as string))) return { ok: false, error: 'signal_ts_format' };

  if (b.confidence !== undefined && (!isNumber(b.confidence) || b.confidence < 0 || b.confidence > 100)) {
    return { ok: false, error: 'confidence' };
  }
  for (const k of ['stop_loss', 'take_profit_1', 'take_profit_2'] as const) {
    const v = b[k];
    if (v !== undefined && (!isNumber(v) || v <= 0)) return { ok: false, error: k };
  }

  return {
    ok: true,
    data: {
      source_id: b.source_id as string,
      strategy_id: b.strategy_id as string,
      symbol: (b.symbol as string).toUpperCase(),
      timeframe: (b.timeframe as string).toUpperCase(),
      direction: b.direction as 'BUY' | 'SELL',
      confidence: b.confidence as number | undefined,
      entry: b.entry as number,
      stop_loss: b.stop_loss as number | undefined,
      take_profit_1: b.take_profit_1 as number | undefined,
      take_profit_2: b.take_profit_2 as number | undefined,
      signal_ts: b.signal_ts as string,
    },
  };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-tv-secret');
  const expected = process.env.TV_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  if (!secret || !safeSecretEqual(secret, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: 'invalid_payload', field: parsed.error }, { status: 400 });
  }

  const p = parsed.data;
  try {
    await execute(
      `INSERT INTO premium_signals
         (source_id, strategy_id, symbol, timeframe, direction, confidence,
          entry, stop_loss, take_profit_1, take_profit_2, raw_payload, signal_ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (source_id) DO NOTHING`,
      [
        p.source_id,
        p.strategy_id,
        p.symbol,
        p.timeframe,
        p.direction,
        p.confidence ?? 90,
        p.entry,
        p.stop_loss ?? null,
        p.take_profit_1 ?? null,
        p.take_profit_2 ?? null,
        JSON.stringify(p),
        new Date(p.signal_ts),
      ],
    );
  } catch (err) {
    // Server-side log retains the full error for debugging; the response
    // body must not echo it back. Postgres error messages routinely include
    // schema details (table names, column names, constraint identifiers)
    // that are useful to an attacker and have no business in an API
    // response.
    console.error('[tv-webhook] db_error:', err);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
