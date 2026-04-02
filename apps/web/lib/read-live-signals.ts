import fs from 'fs';
import path from 'path';

const SIGNALS_FILE = path.join(process.cwd(), '../../data/signals-live.json');
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — if older, treat as stale

export interface LiveSignalFile {
  generated_at: string;
  engine_version?: string;
  min_confidence: number;
  count: number;
  signals: LiveSignal[];
  stats: {
    symbols_checked: number;
    signals_generated: number;
    no_confluence?: number;
    below_threshold?: number;
    errors?: number;
    data_fetch_errors?: number;
  };
}

export interface LiveSignal {
  id: string;
  symbol: string;
  name?: string;
  signal: 'BUY' | 'SELL';
  confidence: number;
  timeframe: string;
  entry: number;
  tp1: number;
  tp2?: number;
  tp3?: number;
  sl: number;
  reasons: string[];
  agreeing_timeframes?: string[];
  confluence_score?: number;
  indicators?: {
    rsi?: number;
    macd_histogram?: number;
    ema_trend?: string;
    stochastic_k?: number;
  };
  source: string;
  timestamp: string;
  expires_in_minutes?: number;
}

export function readLiveSignals(): { signals: LiveSignal[]; isStale: boolean; generatedAt: string } | null {
  try {
    // Try project root relative path first
    let filePath = SIGNALS_FILE;
    if (!fs.existsSync(filePath)) {
      // Try from workspace
      filePath = path.join('/home/naim/.openclaw/workspace/tradeclaw/data/signals-live.json');
    }
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data: LiveSignalFile = JSON.parse(raw);

    const generatedAt = new Date(data.generated_at);
    const ageMs = Date.now() - generatedAt.getTime();
    const isStale = ageMs > MAX_AGE_MS;

    return { signals: data.signals ?? [], isStale, generatedAt: data.generated_at };
  } catch {
    return null;
  }
}
