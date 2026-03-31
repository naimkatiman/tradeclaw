import { NextResponse } from 'next/server';

export const revalidate = 3600;

// Seeded PRNG (mulberry32) — deterministic per ISO week
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const ASSETS = ['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD'];

export async function GET() {
  const now = new Date();
  const weekNum = getISOWeek(now);
  const seed = now.getFullYear() * 100 + weekNum;
  const rand = mulberry32(seed);

  // Generate deterministic weekly stats
  const totalSignals = Math.floor(rand() * 80 + 120); // 120–200
  const winRate = Math.floor(rand() * 20 + 60); // 60–80%
  const topAssetIdx = Math.floor(rand() * ASSETS.length);
  const topAsset = ASSETS[topAssetIdx];
  const topAccuracy = Math.floor(rand() * 15 + 70); // 70–85%
  const newContributors = Math.floor(rand() * 3); // 0–2
  const starsThisWeek = Math.floor(rand() * 5 + 1); // 1–5

  // Daily breakdown (Mon-Sun)
  const dailyBreakdown = Array.from({ length: 7 }, () =>
    Math.floor(rand() * 25 + 12)
  ) as [number, number, number, number, number, number, number];

  // Compute week start (Monday 00:00 UTC)
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset));

  return NextResponse.json(
    {
      weekOf: weekStart.toISOString().split('T')[0],
      isoWeek: weekNum,
      totalSignals,
      winRate,
      topAsset,
      topAccuracy,
      newContributors,
      starsThisWeek,
      dailyBreakdown,
      generatedAt: now.toISOString(),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    }
  );
}
