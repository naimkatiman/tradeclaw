import fs from 'fs';
import path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LatencyPoint {
  timestamp: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  count: number;
}

export interface ApiRouteStats {
  route: string;
  avg: number;
  p95: number;
  max: number;
  count: number;
  lastSeen: number;
}

export interface ThroughputPoint {
  timestamp: number;
  perMinute: number;
  perHour: number;
}

export interface MemoryPoint {
  timestamp: number;
  rss: number;
  heapUsed: number;
  heapTotal: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
}

export interface SignalStats {
  byPair: Record<string, number>;
  byTimeframe: Record<string, number>;
  buy: number;
  sell: number;
  total: number;
}

export interface PerformanceData {
  latency: LatencyPoint[];
  apiRoutes: ApiRouteStats[];
  throughput: ThroughputPoint[];
  memory: MemoryPoint[];
  cache: CacheStats;
  signals: SignalStats;
  startedAt: number;
  lastRestartAt: number;
  sseConnections: number;
  lastUpdated: number;
}

export interface SystemHealth {
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapPct: number;
  };
  uptime: {
    startedAt: number;
    lastRestartAt: number;
    uptimeMs: number;
    uptimeFormatted: string;
  };
  sseConnections: number;
  throughput: {
    perMinute: number;
    perHour: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_POINTS = 1000;
const DATA_DIR = path.join(process.cwd(), 'data');
const METRICS_FILE = path.join(DATA_DIR, 'performance-metrics.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // read-only fs (e.g. Vercel) — ignore
  }
}

function seededRand(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60) % 60;
  const hours = Math.floor(totalSec / 3600) % 24;
  const days = Math.floor(totalSec / 86400);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ─── Seed ────────────────────────────────────────────────────────────────────

function generateSeedData(): PerformanceData {
  const now = Date.now();
  const r = seededRand(0xdeadbeef);

  const PAIRS = [
    'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD',
    'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD', 'BNBUSD', 'SOLUSD',
  ];
  const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // 288 points = 24h at 5-min intervals
  const latency: LatencyPoint[] = [];
  const throughput: ThroughputPoint[] = [];
  const memory: MemoryPoint[] = [];

  for (let i = 0; i < 288; i++) {
    const ts = now - (287 - i) * 5 * 60 * 1000;
    const base = 35 + r() * 35;
    const jitter = r() * 25;

    latency.push({
      timestamp: ts,
      avg: +(base + jitter * 0.5).toFixed(1),
      p50: +base.toFixed(1),
      p95: +(base * 2.8 + jitter).toFixed(1),
      p99: +(base * 5.5 + jitter * 2).toFixed(1),
      count: Math.floor(15 + r() * 90),
    });

    const perMin = +(2 + r() * 8).toFixed(1);
    throughput.push({
      timestamp: ts,
      perMinute: perMin,
      perHour: Math.round(perMin * 60 * (0.75 + r() * 0.5)),
    });

    const rss = Math.round((82 + r() * 50) * 1024 * 1024);
    const heapTotal = Math.round((58 + r() * 42) * 1024 * 1024);
    const heapUsed = Math.round(heapTotal * (0.55 + r() * 0.35));
    memory.push({ timestamp: ts, rss, heapUsed, heapTotal });
  }

  // Signal stats
  const byPair: Record<string, number> = {};
  PAIRS.forEach(p => {
    byPair[p] = Math.floor(40 + r() * 120);
  });
  byPair['BTCUSD'] += 120;
  byPair['ETHUSD'] += 90;
  byPair['XAUUSD'] += 60;

  const signalTotal = Object.values(byPair).reduce((a, b) => a + b, 0);

  const tfWeights = [0.04, 0.12, 0.32, 0.28, 0.16, 0.08];
  const byTimeframe: Record<string, number> = {};
  TIMEFRAMES.forEach((tf, i) => {
    byTimeframe[tf] = Math.floor(signalTotal * tfWeights[i]);
  });

  const buy = Math.floor(signalTotal * (0.47 + r() * 0.06));

  const apiRoutes: ApiRouteStats[] = [
    { route: '/api/signals', avg: 43, p95: 115, max: 270, count: 8840, lastSeen: now - 2800 },
    { route: '/api/screener', avg: 128, p95: 370, max: 710, count: 3450, lastSeen: now - 7200 },
    { route: '/api/leaderboard', avg: 74, p95: 195, max: 460, count: 1920, lastSeen: now - 14000 },
    { route: '/api/alerts', avg: 21, p95: 58, max: 170, count: 2280, lastSeen: now - 4600 },
    { route: '/api/paper-trading', avg: 52, p95: 138, max: 310, count: 1040, lastSeen: now - 20000 },
    { route: '/api/price-feed/sse', avg: 7, p95: 19, max: 48, count: 13200, lastSeen: now - 900 },
    { route: '/api/signals/history', avg: 84, p95: 228, max: 560, count: 1680, lastSeen: now - 11000 },
    { route: '/api/performance', avg: 16, p95: 44, max: 88, count: 380, lastSeen: now - 1800 },
  ];

  const cacheTotal = 48600;
  const cacheHits = Math.floor(cacheTotal * 0.845);

  return {
    latency,
    apiRoutes,
    throughput,
    memory,
    cache: { hits: cacheHits, misses: cacheTotal - cacheHits },
    signals: { byPair, byTimeframe, buy, sell: signalTotal - buy, total: signalTotal },
    startedAt: now - 3 * 24 * 60 * 60 * 1000,
    lastRestartAt: now - 3 * 24 * 60 * 60 * 1000,
    sseConnections: Math.floor(3 + r() * 6),
    lastUpdated: now,
  };
}

// ─── IO ──────────────────────────────────────────────────────────────────────

export function readMetrics(): PerformanceData {
  ensureDataDir();
  if (fs.existsSync(METRICS_FILE)) {
    try {
      const raw = fs.readFileSync(METRICS_FILE, 'utf-8');
      return JSON.parse(raw) as PerformanceData;
    } catch {
      // corrupt file — fall through to seed
    }
  }
  const seed = generateSeedData();
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(seed, null, 2));
  } catch {
    // ignore write failures
  }
  return seed;
}

function writeMetrics(data: PerformanceData): void {
  ensureDataDir();
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
  } catch {
    // ignore write failures on read-only fs
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function recordMetric(type: 'latency', point: LatencyPoint): void;
export function recordMetric(type: 'throughput', point: ThroughputPoint): void;
export function recordMetric(type: 'memory', point: MemoryPoint): void;
export function recordMetric(
  type: 'latency' | 'throughput' | 'memory',
  point: LatencyPoint | ThroughputPoint | MemoryPoint
): void {
  const data = readMetrics();
  if (type === 'latency') {
    data.latency.push(point as LatencyPoint);
    if (data.latency.length > MAX_POINTS) {
      data.latency = data.latency.slice(-MAX_POINTS);
    }
  } else if (type === 'throughput') {
    data.throughput.push(point as ThroughputPoint);
    if (data.throughput.length > MAX_POINTS) {
      data.throughput = data.throughput.slice(-MAX_POINTS);
    }
  } else {
    data.memory.push(point as MemoryPoint);
    if (data.memory.length > MAX_POINTS) {
      data.memory = data.memory.slice(-MAX_POINTS);
    }
  }
  data.lastUpdated = Date.now();
  writeMetrics(data);
}

export function getMetrics(): PerformanceData {
  return readMetrics();
}

export function getSystemHealth(): SystemHealth {
  const data = readMetrics();
  const mem = process.memoryUsage();

  const rssMb = +(mem.rss / 1024 / 1024).toFixed(1);
  const heapUsedMb = +(mem.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMb = +(mem.heapTotal / 1024 / 1024).toFixed(1);
  const heapPct = +((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);

  const now = Date.now();
  const uptimeMs = now - data.startedAt;
  const lastThroughput = data.throughput[data.throughput.length - 1];

  return {
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rssMb,
      heapUsedMb,
      heapTotalMb,
      heapPct,
    },
    uptime: {
      startedAt: data.startedAt,
      lastRestartAt: data.lastRestartAt,
      uptimeMs,
      uptimeFormatted: formatUptime(uptimeMs),
    },
    sseConnections: data.sseConnections,
    throughput: {
      perMinute: lastThroughput?.perMinute ?? 0,
      perHour: lastThroughput?.perHour ?? 0,
    },
  };
}

export function resetMetrics(): void {
  const seed = generateSeedData();
  const now = Date.now();
  seed.startedAt = now;
  seed.lastRestartAt = now;
  writeMetrics(seed);
}
