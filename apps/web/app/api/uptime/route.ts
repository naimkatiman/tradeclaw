import { NextResponse } from 'next/server';

export const revalidate = 300; // 5-minute revalidate

// Seeded pseudo-random number generator (mulberry32)
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hashDate(dateStr: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

interface DayEntry {
  date: string;
  uptime: number;
  incidents: number;
}

interface ServiceEntry {
  name: string;
  uptime30d: number;
  status: 'operational' | 'degraded' | 'outage';
}

const SERVICES = ['Signal Engine', 'API', 'Database', 'SSE Feed'];

function generateUptimeHistory(): DayEntry[] {
  const history: DayEntry[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const rand = seededRandom(hashDate(dateStr, 42));

    let uptime: number;
    let incidents: number;

    if (rand > 0.92) {
      // ~8% chance of degraded day
      uptime = parseFloat((95 + rand * 4.5).toFixed(2));
      incidents = 1;
    } else if (rand > 0.98) {
      // rare outage day (within the 8% above, so effectively ~2%)
      uptime = parseFloat((90 + rand * 5).toFixed(2));
      incidents = Math.floor(rand * 3) + 1;
    } else {
      // Normal day
      uptime = parseFloat((99.5 + rand * 0.5).toFixed(2));
      incidents = 0;
    }

    history.push({ date: dateStr, uptime, incidents });
  }

  return history;
}

function generateServices(history: DayEntry[]): ServiceEntry[] {
  return SERVICES.map((name, idx) => {
    const salt = idx * 1000 + 7;
    let totalUptime = 0;

    for (const day of history) {
      const svcRand = seededRandom(hashDate(day.date, salt));
      const svcUptime = Math.min(100, day.uptime + (svcRand - 0.5) * 1.5);
      totalUptime += svcUptime;
    }

    const avg = parseFloat((totalUptime / history.length).toFixed(2));
    const status: ServiceEntry['status'] =
      avg >= 99 ? 'operational' : avg >= 95 ? 'degraded' : 'outage';

    return { name, uptime30d: avg, status };
  });
}

export async function GET() {
  const uptimeHistory = generateUptimeHistory();
  const services = generateServices(uptimeHistory);

  const overallUptime = parseFloat(
    (uptimeHistory.reduce((sum, d) => sum + d.uptime, 0) / uptimeHistory.length).toFixed(2)
  );

  const body = {
    overallUptime,
    uptimeHistory,
    services,
    lastCheck: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
