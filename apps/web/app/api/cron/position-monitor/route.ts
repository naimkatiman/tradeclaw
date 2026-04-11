import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio, closePosition, type Position } from '../../../../lib/paper-trading';

// ── Auth guard ────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

// ── Price fetching ───────────────────────────────────────────

interface BinanceTicker {
  symbol: string;
  lastPrice: string;
}

const BINANCE_MAP: Record<string, string> = {
  BTCUSDT: 'BTCUSD',
  ETHUSDT: 'ETHUSD',
  XRPUSDT: 'XRPUSD',
  SOLUSDT: 'SOLUSD',
  BNBUSDT: 'BNBUSD',
};

async function fetchLivePrices(): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  const [binanceResult, forexResult, xauResult, xagResult] = await Promise.allSettled([
    // Crypto via Binance
    fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(Object.keys(BINANCE_MAP))}`,
      { signal: AbortSignal.timeout(5000), cache: 'no-store' },
    ).then(r => r.ok ? r.json() as Promise<BinanceTicker[]> : null),
    // Forex via open.er-api
    fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    }).then(r => r.ok ? r.json() as Promise<{ rates: Record<string, number> }> : null),
    // Metals via Stooq
    fetchStooq('xauusd'),
    fetchStooq('xagusd'),
  ]);

  if (binanceResult.status === 'fulfilled' && binanceResult.value) {
    for (const t of binanceResult.value) {
      const pair = BINANCE_MAP[t.symbol];
      if (pair) {
        const price = parseFloat(t.lastPrice);
        if (!isNaN(price) && price > 0) prices.set(pair, price);
      }
    }
  }

  if (forexResult.status === 'fulfilled' && forexResult.value) {
    const r = forexResult.value.rates || {};
    if (r.EUR) prices.set('EURUSD', +(1 / r.EUR).toFixed(5));
    if (r.GBP) prices.set('GBPUSD', +(1 / r.GBP).toFixed(5));
    if (r.JPY) prices.set('USDJPY', +r.JPY.toFixed(3));
    if (r.AUD) prices.set('AUDUSD', +(1 / r.AUD).toFixed(5));
    if (r.CAD) prices.set('USDCAD', +r.CAD.toFixed(5));
  }

  if (xauResult.status === 'fulfilled' && xauResult.value !== null) {
    prices.set('XAUUSD', xauResult.value);
  }
  if (xagResult.status === 'fulfilled' && xagResult.value !== null) {
    prices.set('XAGUSD', xagResult.value);
  }

  return prices;
}

async function fetchStooq(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${symbol}&f=c&h&e=csv`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const val = parseFloat(lines[1].trim());
    return isNaN(val) || val <= 0 ? null : val;
  } catch {
    return null;
  }
}

// ── SL/TP check logic ────────────────────────────────────────

function shouldClose(
  position: Position,
  currentPrice: number,
): { shouldClose: boolean; reason: 'stopLoss' | 'takeProfit' | 'manual'; exitPrice: number } | null {
  const { direction, stopLoss, takeProfit } = position;

  if (direction === 'BUY') {
    if (stopLoss != null && currentPrice <= stopLoss) {
      return { shouldClose: true, reason: 'stopLoss', exitPrice: stopLoss };
    }
    if (takeProfit != null && currentPrice >= takeProfit) {
      return { shouldClose: true, reason: 'takeProfit', exitPrice: takeProfit };
    }
  } else {
    // SELL position
    if (stopLoss != null && currentPrice >= stopLoss) {
      return { shouldClose: true, reason: 'stopLoss', exitPrice: stopLoss };
    }
    if (takeProfit != null && currentPrice <= takeProfit) {
      return { shouldClose: true, reason: 'takeProfit', exitPrice: takeProfit };
    }
  }

  return null;
}

// ── Route handler ────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const portfolio = getPortfolio();
    if (portfolio.positions.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No open positions',
        checked: 0,
        closed: [],
        timestamp: new Date().toISOString(),
      });
    }

    const prices = await fetchLivePrices();
    const closed: Array<{
      positionId: string;
      symbol: string;
      direction: string;
      reason: string;
      entryPrice: number;
      exitPrice: number;
      pnl: number;
    }> = [];
    const skipped: string[] = [];

    for (const position of portfolio.positions) {
      const currentPrice = prices.get(position.symbol);
      if (currentPrice == null) {
        skipped.push(position.symbol);
        continue;
      }

      const check = shouldClose(position, currentPrice);
      if (check) {
        const result = closePosition(position.id, check.exitPrice, check.reason);
        if (result) {
          closed.push({
            positionId: position.id,
            symbol: position.symbol,
            direction: position.direction,
            reason: check.reason,
            entryPrice: position.entryPrice,
            exitPrice: check.exitPrice,
            pnl: result.trade.pnl,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      checked: portfolio.positions.length,
      closed,
      skipped: skipped.length > 0 ? skipped : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  return GET(request);
}
