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

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60) % 60;
  const hours = Math.floor(totalSec / 3600) % 24;
  const days = Math.floor(totalSec / 86400);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Capture a real memory snapshot from the current Node.js process. */
function captureMemoryPoint(): MemoryPoint {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
  };
}

/** Create an empty PerformanceData with real timestamps and one real memory snapshot. */
function createEmptyData(): PerformanceData {
  const now = Date.now();
  return {
    latency: [],
    apiRoutes: [],
    throughput: [],
    memory: [captureMemoryPoint()],
    cache: { hits: 0, misses: 0 },
    signals: { byPair: {}, byTimeframe: {}, buy: 0, sell: 0, total: 0 },
    startedAt: now,
    lastRestartAt: now,
    sseConnections: 0,
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
      // corrupt file — fall through to empty data
    }
  }
  const empty = createEmptyData();
  try {
    fs.writeFileSync(METRICS_FILE, JSON.stringify(empty, null, 2));
  } catch {
    // ignore write failures
  }
  return empty;
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
  const data = readMetrics();

  // Always append a fresh memory snapshot so the dashboard shows real memory
  const memPoint = captureMemoryPoint();
  data.memory.push(memPoint);
  if (data.memory.length > MAX_POINTS) {
    data.memory = data.memory.slice(-MAX_POINTS);
  }
  data.lastUpdated = Date.now();
  writeMetrics(data);

  return data;
}

export function getSystemHealth(): SystemHealth {
  const data = readMetrics();
  const mem = process.memoryUsage();

  const rssMb = +(mem.rss / 1024 / 1024).toFixed(1);
  const heapUsedMb = +(mem.heapUsed / 1024 / 1024).toFixed(1);
  const heapTotalMb = +(mem.heapTotal / 1024 / 1024).toFixed(1);
  const heapPct = +((mem.heapUsed / mem.heapTotal) * 100).toFixed(1);

  const uptimeMs = process.uptime() * 1000;
  const startedAt = data.startedAt || Date.now() - uptimeMs;
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
      startedAt,
      lastRestartAt: data.lastRestartAt || startedAt,
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
  const empty = createEmptyData();
  writeMetrics(empty);
}
