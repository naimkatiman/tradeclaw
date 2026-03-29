/**
 * Signal accuracy tracker.
 * Persists every generated signal to ~/.tradeclaw/signal-history.jsonl
 * and provides historical accuracy analytics.
 */

import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { TradingSignal } from '@tradeclaw/signals';

/** Tracked signal entry persisted to JSONL */
export interface TrackedSignal {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  timestamp: string;
  skill: string;
  closed_at?: string;
  result?: 'tp1' | 'tp2' | 'tp3' | 'stopped' | 'expired';
  pnl_pips?: number;
}

/** Accuracy summary returned by getHistory() */
export interface HistorySummary {
  totalSignals: number;
  closedSignals: number;
  winRate: number;
  bestSymbol: string | null;
  bestSkill: string | null;
  symbolBreakdown: Record<string, { total: number; wins: number; rate: number }>;
  skillBreakdown: Record<string, { total: number; wins: number; rate: number }>;
  recentSignals: TrackedSignal[];
}

const HISTORY_DIR = join(homedir(), '.tradeclaw');
const HISTORY_FILE = join(HISTORY_DIR, 'signal-history.jsonl');

async function ensureDir(): Promise<void> {
  if (!existsSync(HISTORY_DIR)) {
    await mkdir(HISTORY_DIR, { recursive: true });
  }
}

export async function trackSignal(signal: TradingSignal): Promise<void> {
  await ensureDir();

  const entry: TrackedSignal = {
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    confidence: signal.confidence,
    entry: signal.entry,
    tp1: signal.takeProfit1,
    tp2: signal.takeProfit2,
    tp3: signal.takeProfit3,
    sl: signal.stopLoss,
    timestamp: signal.timestamp,
    skill: signal.skill ?? 'engine',
  };

  await appendFile(HISTORY_FILE, JSON.stringify(entry) + '\n', 'utf-8');
}

export async function trackSignals(signals: TradingSignal[]): Promise<void> {
  if (signals.length === 0) return;
  await ensureDir();

  const lines = signals.map(signal => {
    const entry: TrackedSignal = {
      id: signal.id,
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      entry: signal.entry,
      tp1: signal.takeProfit1,
      tp2: signal.takeProfit2,
      tp3: signal.takeProfit3,
      sl: signal.stopLoss,
      timestamp: signal.timestamp,
      skill: signal.skill ?? 'engine',
    };
    return JSON.stringify(entry);
  });

  await appendFile(HISTORY_FILE, lines.join('\n') + '\n', 'utf-8');
}

export async function loadHistory(): Promise<TrackedSignal[]> {
  if (!existsSync(HISTORY_FILE)) return [];

  const raw = await readFile(HISTORY_FILE, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);
  const signals: TrackedSignal[] = [];

  for (const line of lines) {
    try {
      signals.push(JSON.parse(line) as TrackedSignal);
    } catch {
      // skip malformed lines
    }
  }

  return signals;
}

export async function getHistory(): Promise<HistorySummary> {
  const signals = await loadHistory();

  const symbolMap: Record<string, { total: number; wins: number }> = {};
  const skillMap: Record<string, { total: number; wins: number }> = {};
  let closedCount = 0;
  let winCount = 0;

  for (const sig of signals) {
    if (!symbolMap[sig.symbol]) symbolMap[sig.symbol] = { total: 0, wins: 0 };
    symbolMap[sig.symbol].total++;

    const sk = sig.skill || 'engine';
    if (!skillMap[sk]) skillMap[sk] = { total: 0, wins: 0 };
    skillMap[sk].total++;

    if (sig.result) {
      closedCount++;
      const isWin = sig.result === 'tp1' || sig.result === 'tp2' || sig.result === 'tp3';
      if (isWin) {
        winCount++;
        symbolMap[sig.symbol].wins++;
        skillMap[sk].wins++;
      }
    }
  }

  const symbolBreakdown: HistorySummary['symbolBreakdown'] = {};
  for (const [sym, data] of Object.entries(symbolMap)) {
    symbolBreakdown[sym] = {
      total: data.total,
      wins: data.wins,
      rate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    };
  }

  const skillBreakdown: HistorySummary['skillBreakdown'] = {};
  for (const [sk, data] of Object.entries(skillMap)) {
    skillBreakdown[sk] = {
      total: data.total,
      wins: data.wins,
      rate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    };
  }

  let bestSymbol: string | null = null;
  let maxSymbolTotal = 0;
  for (const [sym, data] of Object.entries(symbolMap)) {
    if (data.total > maxSymbolTotal) {
      maxSymbolTotal = data.total;
      bestSymbol = sym;
    }
  }

  let bestSkill: string | null = null;
  let maxSkillTotal = 0;
  for (const [sk, data] of Object.entries(skillMap)) {
    if (data.total > maxSkillTotal) {
      maxSkillTotal = data.total;
      bestSkill = sk;
    }
  }

  return {
    totalSignals: signals.length,
    closedSignals: closedCount,
    winRate: closedCount > 0 ? Math.round((winCount / closedCount) * 100) : 0,
    bestSymbol,
    bestSkill,
    symbolBreakdown,
    skillBreakdown,
    recentSignals: signals.slice(-20).reverse(),
  };
}
