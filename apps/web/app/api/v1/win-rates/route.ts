import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Read win rates from signals-live.json (computed by scanner-engine.py)
const SIGNALS_FILE = path.join(process.cwd(), '../../data/signals-live.json');

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface WinRateEntry {
  symbol: string;
  direction: string;
  total: number;
  wins: number;
  win_rate: number;
}

export async function GET() {
  try {
    if (!fs.existsSync(SIGNALS_FILE)) {
      return NextResponse.json({ win_rates: [], overall: null, pending_signals: 0 });
    }

    const raw = fs.readFileSync(SIGNALS_FILE, 'utf-8');
    const data = JSON.parse(raw);

    // Extract win_rate data from confluence signals
    const winRateMap: Record<string, WinRateEntry> = {};

    const signals = [
      ...(data.confluence_signals ?? []),
      ...(data.all_signals ?? []),
    ];

    for (const s of signals) {
      if (!s.win_rate || !s.win_rate.total || s.win_rate.total < 1) continue;
      const key = `${s.symbol}_${s.signal}`;
      if (!winRateMap[key]) {
        winRateMap[key] = {
          symbol: s.symbol,
          direction: s.signal,
          total: s.win_rate.total,
          wins: s.win_rate.wins,
          win_rate: s.win_rate.win_rate,
        };
      }
    }

    const win_rates = Object.values(winRateMap).sort((a, b) => b.win_rate - a.win_rate);

    // Overall
    const overall = win_rates.length > 0
      ? {
          total: win_rates.reduce((s, r) => s + r.total, 0),
          wins: win_rates.reduce((s, r) => s + r.wins, 0),
          win_rate: Math.round(
            (win_rates.reduce((s, r) => s + r.wins, 0) /
              win_rates.reduce((s, r) => s + r.total, 0)) * 1000
          ) / 10,
        }
      : null;

    return NextResponse.json({
      win_rates,
      overall,
      stats: data.stats ?? null,
      generated_at: data.generated_at ?? new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });

  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to read win rate data', details: String(err) },
      { status: 500 }
    );
  }
}
