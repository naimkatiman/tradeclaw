import { NextRequest, NextResponse } from 'next/server';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  indicators: StrategyIndicator[];
  symbols: string[];
  timeframes: string[];
  riskManagement: RiskConfig;
  isActive: boolean;
  createdAt: string;
  performance?: StrategyPerformance;
}

interface StrategyIndicator {
  name: string;
  params: Record<string, number>;
  condition: string;
  weight: number;
}

interface RiskConfig {
  maxRiskPercent: number;
  leverage: number;
  maxOpenTrades: number;
  tpMode: 'fixed' | 'fibonacci' | 'atr';
  slMode: 'fixed' | 'atr' | 'support_resistance';
  fibLevels: number[];
}

interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  period: string;
}

// Built-in strategy templates
const PRESET_STRATEGIES: Strategy[] = [
  {
    id: 'strat-momentum-scalp',
    name: 'Momentum Scalper',
    description: 'Fast RSI + MACD confluence for quick scalps on M5/M15. High win rate, small targets.',
    indicators: [
      { name: 'RSI', params: { period: 14, overbought: 70, oversold: 30 }, condition: 'RSI crosses below 30 (BUY) or above 70 (SELL)', weight: 0.4 },
      { name: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, condition: 'MACD histogram crosses zero line', weight: 0.35 },
      { name: 'EMA', params: { period: 20 }, condition: 'Price above EMA20 (BUY) or below (SELL)', weight: 0.25 },
    ],
    symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD'],
    timeframes: ['M5', 'M15'],
    riskManagement: {
      maxRiskPercent: 1,
      leverage: 100,
      maxOpenTrades: 5,
      tpMode: 'fibonacci',
      slMode: 'atr',
      fibLevels: [1.0, 1.618, 2.618],
    },
    isActive: true,
    createdAt: '2026-03-20T08:00:00Z',
    performance: {
      totalTrades: 342,
      winRate: 68.4,
      profitFactor: 2.1,
      maxDrawdown: 8.3,
      sharpeRatio: 1.85,
      totalPnl: 4230.50,
      avgWin: 28.40,
      avgLoss: -18.60,
      bestTrade: 187.20,
      worstTrade: -52.30,
      period: '30d',
    },
  },
  {
    id: 'strat-trend-rider',
    name: 'Trend Rider',
    description: 'Multi-timeframe trend following with EMA stack + Bollinger confirmation. Larger moves, wider stops.',
    indicators: [
      { name: 'EMA Stack', params: { ema20: 20, ema50: 50, ema200: 200 }, condition: 'EMA20 > EMA50 > EMA200 (BUY) or inverse (SELL)', weight: 0.45 },
      { name: 'Bollinger Bands', params: { period: 20, stdDev: 2 }, condition: 'Price touches or crosses outer band', weight: 0.3 },
      { name: 'ADX', params: { period: 14, threshold: 25 }, condition: 'ADX > 25 confirms trend strength', weight: 0.25 },
    ],
    symbols: ['XAUUSD', 'BTCUSD', 'ETHUSD', 'USDJPY'],
    timeframes: ['H1', 'H4'],
    riskManagement: {
      maxRiskPercent: 2,
      leverage: 50,
      maxOpenTrades: 3,
      tpMode: 'fibonacci',
      slMode: 'support_resistance',
      fibLevels: [1.618, 2.618, 4.236],
    },
    isActive: true,
    createdAt: '2026-03-18T10:00:00Z',
    performance: {
      totalTrades: 87,
      winRate: 54.0,
      profitFactor: 2.8,
      maxDrawdown: 12.1,
      sharpeRatio: 2.15,
      totalPnl: 8640.20,
      avgWin: 245.30,
      avgLoss: -94.50,
      bestTrade: 1205.00,
      worstTrade: -310.40,
      period: '30d',
    },
  },
  {
    id: 'strat-mean-revert',
    name: 'Mean Reversion',
    description: 'Stochastic + RSI divergence at Bollinger extremes. Catches reversals in ranging markets.',
    indicators: [
      { name: 'Stochastic', params: { kPeriod: 14, dPeriod: 3, smooth: 3 }, condition: 'K crosses D in oversold/overbought zone', weight: 0.35 },
      { name: 'RSI Divergence', params: { period: 14 }, condition: 'RSI diverges from price at extremes', weight: 0.35 },
      { name: 'Bollinger Bands', params: { period: 20, stdDev: 2.5 }, condition: 'Price at or beyond 2.5σ band', weight: 0.3 },
    ],
    symbols: ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCHF'],
    timeframes: ['M15', 'H1'],
    riskManagement: {
      maxRiskPercent: 1.5,
      leverage: 100,
      maxOpenTrades: 4,
      tpMode: 'fixed',
      slMode: 'atr',
      fibLevels: [1.0, 1.618],
    },
    isActive: false,
    createdAt: '2026-03-15T14:00:00Z',
    performance: {
      totalTrades: 156,
      winRate: 62.8,
      profitFactor: 1.95,
      maxDrawdown: 10.5,
      sharpeRatio: 1.55,
      totalPnl: 3120.80,
      avgWin: 42.50,
      avgLoss: -33.20,
      bestTrade: 320.00,
      worstTrade: -89.50,
      period: '30d',
    },
  },
  {
    id: 'strat-breakout',
    name: 'Breakout Hunter',
    description: 'Support/resistance breakout with volume confirmation. Daily timeframe, swing trades.',
    indicators: [
      { name: 'S/R Levels', params: { lookback: 50 }, condition: 'Price breaks above resistance or below support', weight: 0.4 },
      { name: 'Volume', params: { avgPeriod: 20, threshold: 1.5 }, condition: 'Volume > 1.5x 20-period average', weight: 0.35 },
      { name: 'ATR', params: { period: 14 }, condition: 'ATR expanding (volatility increase)', weight: 0.25 },
    ],
    symbols: ['XAUUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD'],
    timeframes: ['H4', 'D1'],
    riskManagement: {
      maxRiskPercent: 2.5,
      leverage: 20,
      maxOpenTrades: 2,
      tpMode: 'fibonacci',
      slMode: 'support_resistance',
      fibLevels: [1.618, 2.618, 4.236],
    },
    isActive: true,
    createdAt: '2026-03-10T09:00:00Z',
    performance: {
      totalTrades: 34,
      winRate: 47.1,
      profitFactor: 3.2,
      maxDrawdown: 15.2,
      sharpeRatio: 2.45,
      totalPnl: 12450.00,
      avgWin: 780.30,
      avgLoss: -245.80,
      bestTrade: 3200.00,
      worstTrade: -620.00,
      period: '30d',
    },
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      count: PRESET_STRATEGIES.length,
      strategies: PRESET_STRATEGIES,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, indicators, symbols, timeframes, riskManagement } = body;

    if (!name || !indicators || !symbols?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, indicators, symbols' },
        { status: 400 }
      );
    }

    const newStrategy: Strategy = {
      id: `strat-${Date.now().toString(36)}`,
      name,
      description: description || '',
      indicators,
      symbols,
      timeframes: timeframes || ['H1'],
      riskManagement: riskManagement || {
        maxRiskPercent: 1,
        leverage: 100,
        maxOpenTrades: 5,
        tpMode: 'fibonacci',
        slMode: 'atr',
        fibLevels: [1.0, 1.618, 2.618],
      },
      isActive: false,
      createdAt: new Date().toISOString(),
    };

    // In production, save to DB. For now, return the created strategy.
    return NextResponse.json({ strategy: newStrategy }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
