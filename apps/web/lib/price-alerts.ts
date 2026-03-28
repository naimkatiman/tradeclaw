import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriceAlert {
  id: string;
  symbol: string;
  direction: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  percentMove?: number;
  timeWindow?: string;
  status: 'active' | 'triggered' | 'expired';
  triggeredAt?: string;
  createdAt: string;
  note?: string;
}

export interface AlertsData {
  alerts: PriceAlert[];
  lastChecked: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'price-alerts.json');

export const SUPPORTED_SYMBOLS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'GBPUSD',
  'USDJPY', 'XAGUSD', 'AUDUSD', 'XRPUSD', 'USDCAD',
];

export const BASE_PRICES: Record<string, number> = {
  BTCUSD: 87500,
  ETHUSD: 3400,
  XAUUSD: 2180,
  EURUSD: 1.083,
  GBPUSD: 1.264,
  USDJPY: 151.2,
  XAGUSD: 24.8,
  AUDUSD: 0.654,
  XRPUSD: 0.615,
  USDCAD: 1.365,
};

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Read-only fs (e.g. Vercel) — ignore
  }
}

function generateId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

export function readAlerts(): PriceAlert[] {
  ensureDataDir();
  if (fs.existsSync(ALERTS_FILE)) {
    try {
      const raw = fs.readFileSync(ALERTS_FILE, 'utf-8');
      const data = JSON.parse(raw) as AlertsData;
      return data.alerts ?? [];
    } catch {
      // Corrupt file — return empty
    }
  }
  return [];
}

function writeAlerts(alerts: PriceAlert[]): void {
  ensureDataDir();
  try {
    const data: AlertsData = { alerts, lastChecked: new Date().toISOString() };
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(data, null, 2));
  } catch {
    // ignore write failures on read-only fs
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function getAlerts(filters?: {
  status?: PriceAlert['status'];
  symbol?: string;
}): PriceAlert[] {
  let alerts = readAlerts();
  if (filters?.status) {
    alerts = alerts.filter(a => a.status === filters.status);
  }
  if (filters?.symbol) {
    const sym = filters.symbol.toUpperCase();
    alerts = alerts.filter(a => a.symbol === sym);
  }
  return alerts.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getAlert(id: string): PriceAlert | null {
  const alerts = readAlerts();
  return alerts.find(a => a.id === id) ?? null;
}

export function createAlert(data: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>): PriceAlert {
  const alerts = readAlerts();
  const alert: PriceAlert = {
    ...data,
    id: generateId(),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  alerts.push(alert);
  writeAlerts(alerts);
  return alert;
}

export function updateAlert(id: string, updates: Partial<PriceAlert>): PriceAlert | null {
  const alerts = readAlerts();
  const idx = alerts.findIndex(a => a.id === id);
  if (idx === -1) return null;
  const updated = { ...alerts[idx], ...updates, id };
  alerts[idx] = updated;
  writeAlerts(alerts);
  return updated;
}

export function deleteAlert(id: string): boolean {
  const alerts = readAlerts();
  const idx = alerts.findIndex(a => a.id === id);
  if (idx === -1) return false;
  alerts.splice(idx, 1);
  writeAlerts(alerts);
  return true;
}

// ---------------------------------------------------------------------------
// Check alerts against current prices
// ---------------------------------------------------------------------------

export interface CheckResult {
  triggered: PriceAlert[];
  checkedAt: string;
}

export function checkAlerts(currentPrices: Record<string, number>): CheckResult {
  const alerts = readAlerts();
  const nowIso = new Date().toISOString();
  const triggered: PriceAlert[] = [];

  const updated = alerts.map(alert => {
    if (alert.status !== 'active') return alert;

    const price = currentPrices[alert.symbol];
    if (price === undefined) return alert;

    const isTriggered =
      alert.direction === 'above'
        ? price >= alert.targetPrice
        : price <= alert.targetPrice;

    if (isTriggered) {
      const t: PriceAlert = { ...alert, status: 'triggered', triggeredAt: nowIso };
      triggered.push(t);
      return t;
    }
    return alert;
  });

  writeAlerts(updated);
  return { triggered, checkedAt: nowIso };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface AlertStats {
  totalActive: number;
  totalTriggered: number;
  totalExpired: number;
  triggeredToday: number;
  mostWatchedSymbol: string | null;
  bySymbol: Record<string, number>;
}

export function getAlertStats(): AlertStats {
  const alerts = readAlerts();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const bySymbol: Record<string, number> = {};
  let totalActive = 0;
  let totalTriggered = 0;
  let totalExpired = 0;
  let triggeredToday = 0;

  for (const a of alerts) {
    if (a.status === 'active') totalActive++;
    if (a.status === 'triggered') totalTriggered++;
    if (a.status === 'expired') totalExpired++;
    if (
      a.status === 'triggered' &&
      a.triggeredAt &&
      new Date(a.triggeredAt) >= todayStart
    ) {
      triggeredToday++;
    }
    bySymbol[a.symbol] = (bySymbol[a.symbol] ?? 0) + 1;
  }

  const mostWatchedSymbol =
    Object.keys(bySymbol).sort((a, b) => bySymbol[b] - bySymbol[a])[0] ?? null;

  return {
    totalActive,
    totalTriggered,
    totalExpired,
    triggeredToday,
    mostWatchedSymbol,
    bySymbol,
  };
}
