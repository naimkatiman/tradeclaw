export type Direction = 'BUY' | 'SELL';
export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
export type Period = '7d' | '30d' | 'all';
export type LeaderboardSort = 'hitRate' | 'totalSignals' | 'avgConfidence';
export interface Signal {
    id?: string;
    pair: string;
    direction: Direction;
    confidence: number;
    timeframe: Timeframe;
    price?: number;
    entryPrice?: number;
    takeProfit?: number;
    stopLoss?: number;
    rsi?: number;
    macd?: number;
    timestamp?: string;
}
export interface LeaderboardEntry {
    pair: string;
    totalSignals: number;
    wins: number;
    losses: number;
    pending: number;
    hitRate: number;
    avgConfidence: number;
    avgPnl?: number;
}
export interface HealthStatus {
    status: 'ok' | 'degraded' | 'down';
    version: string;
    uptime: number;
    node: string;
    timestamp: string;
    signalCount?: number;
}
export interface SignalFilter {
    pair?: string;
    direction?: Direction;
    timeframe?: Timeframe;
    limit?: number;
    minConfidence?: number;
}
export interface LeaderboardFilter {
    period?: Period;
    sort?: LeaderboardSort;
}
export interface TradeclawClientOptions {
    /** Base URL of your TradeClaw instance. Defaults to https://tradeclaw.win */
    baseUrl?: string;
    /** API key for authenticated endpoints */
    apiKey?: string;
    /** Request timeout in ms (default: 10000) */
    timeout?: number;
}
