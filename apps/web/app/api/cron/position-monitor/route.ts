import { NextRequest, NextResponse } from 'next/server';
import { getAllOpenPositionsForSweep, closePosition, type Position } from '../../../../lib/paper-trading';
import { requireCronAuth } from '../../../../lib/cron-auth';

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

interface PriceObservation {
  price: number;
  source: 'binance-spot' | 'open-er-api' | 'stooq';
  fetchedAt: string;
}

async function fetchLivePrices(): Promise<Map<string, PriceObservation>> {
  const prices = new Map<string, PriceObservation>();

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
    const fetchedAt = new Date().toISOString();
    for (const t of binanceResult.value) {
      const pair = BINANCE_MAP[t.symbol];
      if (pair) {
        const price = parseFloat(t.lastPrice);
        if (!isNaN(price) && price > 0) {
          prices.set(pair, { price, source: 'binance-spot', fetchedAt });
        }
      }
    }
  }

  if (forexResult.status === 'fulfilled' && forexResult.value) {
    const r = forexResult.value.rates || {};
    const fetchedAt = new Date().toISOString();
    if (r.EUR) prices.set('EURUSD', { price: +(1 / r.EUR).toFixed(5), source: 'open-er-api', fetchedAt });
    if (r.GBP) prices.set('GBPUSD', { price: +(1 / r.GBP).toFixed(5), source: 'open-er-api', fetchedAt });
    if (r.JPY) prices.set('USDJPY', { price: +r.JPY.toFixed(3), source: 'open-er-api', fetchedAt });
    if (r.AUD) prices.set('AUDUSD', { price: +(1 / r.AUD).toFixed(5), source: 'open-er-api', fetchedAt });
    if (r.CAD) prices.set('USDCAD', { price: +r.CAD.toFixed(5), source: 'open-er-api', fetchedAt });
  }

  if (xauResult.status === 'fulfilled' && xauResult.value !== null) {
    prices.set('XAUUSD', { price: xauResult.value, source: 'stooq', fetchedAt: new Date().toISOString() });
  }
  if (xagResult.status === 'fulfilled' && xagResult.value !== null) {
    prices.set('XAGUSD', { price: xagResult.value, source: 'stooq', fetchedAt: new Date().toISOString() });
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

export function evaluatePaperExit(
  position: Position,
  currentPrice: number,
): { reason: 'stopLoss' | 'takeProfit'; observedPrice: number } | null {
  const { direction, stopLoss, takeProfit } = position;

  if (direction === 'BUY') {
    if (stopLoss != null && currentPrice <= stopLoss) {
      return { reason: 'stopLoss', observedPrice: currentPrice };
    }
    if (takeProfit != null && currentPrice >= takeProfit) {
      return { reason: 'takeProfit', observedPrice: currentPrice };
    }
  } else {
    // SELL position
    if (stopLoss != null && currentPrice >= stopLoss) {
      return { reason: 'stopLoss', observedPrice: currentPrice };
    }
    if (takeProfit != null && currentPrice <= takeProfit) {
      return { reason: 'takeProfit', observedPrice: currentPrice };
    }
  }

  return null;
}

// ── Route handler ────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  try {
    const positions = await getAllOpenPositionsForSweep();
    if (positions.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No open positions',
        mode: 'paper-simulation',
        checked: 0,
        closed: [],
        timestamp: new Date().toISOString(),
      });
    }

    const prices = await fetchLivePrices();
    const closed: Array<{
      positionId: string;
      userId: string;
      symbol: string;
      direction: string;
      reason: string;
      entryPrice: number;
      observedPrice: number;
      exitPrice: number;
      priceSource: PriceObservation['source'];
      priceFetchedAt: string;
      pnl: number;
    }> = [];
    const skipped: string[] = [];

    for (const position of positions) {
      const observation = prices.get(position.symbol);
      if (!observation) {
        skipped.push(position.symbol);
        continue;
      }

      const check = evaluatePaperExit(position, observation.price);
      if (check) {
        const result = await closePosition(
          { userId: position.userId, positionId: position.id },
          check.observedPrice,
          check.reason,
        );
        if (result) {
          closed.push({
            positionId: position.id,
            userId: position.userId,
            symbol: position.symbol,
            direction: position.direction,
            reason: check.reason,
            entryPrice: position.entryPrice,
            observedPrice: check.observedPrice,
            exitPrice: result.trade.exitPrice,
            priceSource: observation.source,
            priceFetchedAt: observation.fetchedAt,
            pnl: result.trade.pnl,
          });

        }
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'paper-simulation',
      checked: positions.length,
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
