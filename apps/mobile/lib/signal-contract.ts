export interface ObservedSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number | null;
  takeProfit3: number | null;
  timeframe: string;
  timestamp: string;
  source: 'real';
  dataQuality: 'real';
}

export interface ParsedSignalResponse {
  available: boolean;
  signals: ObservedSignal[];
  reason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function positiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function optionalPositiveNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return positiveNumber(value) ? value : undefined;
}

export function normalizeObservedSignal(value: unknown): ObservedSignal | null {
  if (!isRecord(value)) return null;
  if (value.source !== 'real' || value.dataQuality !== 'real') return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  if (typeof value.symbol !== 'string' || value.symbol.length === 0) return null;
  if (value.direction !== 'BUY' && value.direction !== 'SELL') return null;
  if (typeof value.confidence !== 'number' || !Number.isFinite(value.confidence)) return null;
  if (value.confidence < 0 || value.confidence > 100) return null;
  if (!positiveNumber(value.entry)) return null;
  if (!positiveNumber(value.stopLoss)) return null;
  if (!positiveNumber(value.takeProfit1)) return null;
  if (typeof value.timeframe !== 'string' || value.timeframe.length === 0) return null;
  if (typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp))) return null;

  const takeProfit2 = optionalPositiveNumber(value.takeProfit2);
  const takeProfit3 = optionalPositiveNumber(value.takeProfit3);
  if (takeProfit2 === undefined || takeProfit3 === undefined) return null;

  return {
    id: value.id,
    symbol: value.symbol,
    direction: value.direction,
    confidence: value.confidence,
    entry: value.entry,
    stopLoss: value.stopLoss,
    takeProfit1: value.takeProfit1,
    takeProfit2,
    takeProfit3,
    timeframe: value.timeframe,
    timestamp: value.timestamp,
    source: 'real',
    dataQuality: 'real',
  };
}

export function parseSignalResponse(value: unknown): ParsedSignalResponse {
  if (!isRecord(value)) {
    return { available: false, signals: [], reason: 'invalid-api-response' };
  }

  if (value.available === false) {
    return {
      available: false,
      signals: [],
      reason: typeof value.reason === 'string' ? value.reason : 'signal-data-unavailable',
    };
  }

  const rows = Array.isArray(value.signals) ? value.signals : [];
  const signals = rows
    .map(normalizeObservedSignal)
    .filter((signal): signal is ObservedSignal => signal !== null);

  if (signals.length === 0) {
    return {
      available: false,
      signals: [],
      reason: rows.length > 0 ? 'no-provider-observed-candidates' : 'no-observed-candidates',
    };
  }

  return { available: true, signals, reason: null };
}
