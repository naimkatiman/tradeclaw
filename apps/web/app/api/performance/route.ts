import { NextResponse } from 'next/server';
import { getMetrics, getSystemHealth } from '@/lib/performance-metrics';

export async function GET() {
  const data = getMetrics();
  const health = getSystemHealth();

  // Average latency stats from last 12 data points (~1h)
  const recentLatency = data.latency.slice(-12);
  const latencyStats =
    recentLatency.length > 0
      ? {
          avg: +(recentLatency.reduce((s, p) => s + p.avg, 0) / recentLatency.length).toFixed(1),
          p50: +(recentLatency.reduce((s, p) => s + p.p50, 0) / recentLatency.length).toFixed(1),
          p95: +(recentLatency.reduce((s, p) => s + p.p95, 0) / recentLatency.length).toFixed(1),
          p99: +(recentLatency.reduce((s, p) => s + p.p99, 0) / recentLatency.length).toFixed(1),
        }
      : { avg: 0, p50: 0, p95: 0, p99: 0 };

  const totalCacheOps = data.cache.hits + data.cache.misses;
  const hitRate =
    totalCacheOps > 0 ? +((data.cache.hits / totalCacheOps) * 100).toFixed(1) : 0;

  return NextResponse.json({
    latency: latencyStats,
    apiRoutes: data.apiRoutes,
    throughput: health.throughput,
    memory: health.memory,
    cache: { ...data.cache, hitRate },
    signals: data.signals,
    uptime: health.uptime,
    sseConnections: health.sseConnections,
    lastUpdated: data.lastUpdated,
  });
}
