import 'server-only';

import { queryOne } from './db-pool';

export interface ConnectorStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastCheck: string;
  error?: string;
}

export async function checkMarketDataHub(): Promise<ConnectorStatus> {
  const url = process.env.MARKET_DATA_HUB_URL;
  const start = Date.now();
  const base: Omit<ConnectorStatus, 'status' | 'latencyMs' | 'error'> = {
    id: 'market-data-hub',
    name: 'Market Data Hub',
    lastCheck: new Date().toISOString(),
  };

  if (!url) {
    return { ...base, status: 'down', latencyMs: 0, error: 'MARKET_DATA_HUB_URL not set' };
  }

  try {
    const healthUrl = url.replace(/\/$/, '') + '/health';
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { ...base, status: latencyMs > 2000 ? 'degraded' : 'healthy', latencyMs };
    }
    return { ...base, status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
  } catch (err: unknown) {
    return {
      ...base,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function checkDatabaseConnection(): Promise<ConnectorStatus> {
  const start = Date.now();
  const base: Omit<ConnectorStatus, 'status' | 'latencyMs' | 'error'> = {
    id: 'database',
    name: 'PostgreSQL (Railway)',
    lastCheck: new Date().toISOString(),
  };

  try {
    await queryOne<{ ok: number }>('SELECT 1 AS ok');
    const latencyMs = Date.now() - start;
    return { ...base, status: latencyMs > 1000 ? 'degraded' : 'healthy', latencyMs };
  } catch (err: unknown) {
    return {
      ...base,
      status: 'down',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getConnectorStatuses(): Promise<ConnectorStatus[]> {
  const [mdh, db] = await Promise.all([checkMarketDataHub(), checkDatabaseConnection()]);
  return [mdh, db];
}
