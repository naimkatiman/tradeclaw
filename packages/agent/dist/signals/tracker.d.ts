/**
 * Signal accuracy tracker.
 * Persists every generated signal to ~/.tradeclaw/signal-history.jsonl
 * and provides historical accuracy analytics.
 */
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
    symbolBreakdown: Record<string, {
        total: number;
        wins: number;
        rate: number;
    }>;
    skillBreakdown: Record<string, {
        total: number;
        wins: number;
        rate: number;
    }>;
    recentSignals: TrackedSignal[];
}
export declare function trackSignal(signal: TradingSignal): Promise<void>;
export declare function trackSignals(signals: TradingSignal[]): Promise<void>;
export declare function loadHistory(): Promise<TrackedSignal[]>;
export declare function getHistory(): Promise<HistorySummary>;
//# sourceMappingURL=tracker.d.ts.map