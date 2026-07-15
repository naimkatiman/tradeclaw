import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const indicatorSchema = z.object({
  name: z.string().min(1),
  params: z.record(z.string(), z.number()).default({}),
  condition: z.string().min(1),
  weight: z.number().min(0).max(1),
});

const riskSchema = z.object({
  maxRiskPercent: z.number().positive(),
  leverage: z.number().int().positive(),
  maxOpenTrades: z.number().int().positive(),
  tpMode: z.enum(['fixed', 'fibonacci', 'atr']),
  slMode: z.enum(['fixed', 'atr', 'support_resistance']),
  fibLevels: z.array(z.number()).min(1),
});

const createStrategySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  indicators: z.array(indicatorSchema).min(1),
  symbols: z.array(z.string().min(1)).min(1),
  timeframes: z.array(z.string().min(1)).min(1),
  riskManagement: riskSchema.optional(),
  risk: z
    .object({
      stopLossPct: z.number().positive(),
      takeProfitPct: z.number().positive(),
      riskRewardRatio: z.number().positive(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

interface CreateStrategyInput {
  name: string;
  description: string;
  indicators: StrategyIndicator[];
  symbols: string[];
  timeframes: string[];
  riskManagement?: RiskConfig;
  risk?: {
    stopLossPct: number;
    takeProfitPct: number;
    riskRewardRatio: number;
  };
  isActive?: boolean;
}

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

const DEFAULT_RISK: RiskConfig = {
  maxRiskPercent: 1.5,
  leverage: 50,
  maxOpenTrades: 3,
  tpMode: 'fibonacci',
  slMode: 'atr',
  fibLevels: [1, 1.618, 2.618],
};

const PERFORMANCE_STATUS = {
  available: false,
  basis: 'unavailable',
  detail: 'No measured backtest or live-execution results are connected to these strategy definitions.',
} as const;

const PRESET_STRATEGIES: Strategy[] = [
  {
    id: 'strat-momentum-scalper',
    name: 'Momentum Scalper',
    description: 'Fast RSI + MACD confluence designed for frequent small-target setups on M5/M15.',
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
      fibLevels: [1, 1.618, 2.618],
    },
    isActive: true,
    createdAt: '2026-03-20T08:00:00Z',
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
      fibLevels: [1, 1.618],
    },
    isActive: false,
    createdAt: '2026-03-15T14:00:00Z',
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
  },
  {
    id: 'strat-sr-bounce',
    name: 'S/R Bounce Trader',
    description: 'Buy on support, sell on resistance in ranging markets. ADX < 25 filter ensures non-trending conditions.',
    indicators: [
      { name: 'S/R Levels', params: { lookback: 50 }, condition: 'Price within 20% of support (BUY) or resistance (SELL)', weight: 0.35 },
      { name: 'RSI', params: { period: 14, overbought: 70, oversold: 30 }, condition: 'RSI oversold at support (BUY) or overbought at resistance (SELL)', weight: 0.25 },
      { name: 'Stochastic', params: { kPeriod: 14, dPeriod: 3, smooth: 3 }, condition: 'Stochastic confirms RSI extreme', weight: 0.2 },
      { name: 'ADX', params: { period: 14, threshold: 25 }, condition: 'ADX < 25 confirms ranging market', weight: 0.2 },
    ],
    symbols: ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCHF', 'XAUUSD'],
    timeframes: ['M15', 'H1'],
    riskManagement: {
      maxRiskPercent: 1.5,
      leverage: 50,
      maxOpenTrades: 4,
      tpMode: 'fixed',
      slMode: 'atr',
      fibLevels: [1, 1.618],
    },
    isActive: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
  {
    id: 'strat-vol-breakout',
    name: 'Volatility Breakout',
    description: 'Bollinger squeeze breakout with ADX/DI confirmation. Catches expansion moves from compressed ranges.',
    indicators: [
      { name: 'Bollinger Bands', params: { period: 20, stdDev: 2 }, condition: 'Bandwidth < 2% (squeeze) then expansion with price outside bands', weight: 0.3 },
      { name: 'ADX', params: { period: 14, threshold: 20 }, condition: 'ADX > 20 and rising — directional momentum building', weight: 0.3 },
      { name: 'S/R Levels', params: { lookback: 50 }, condition: 'Price breaks above resistance (BUY) or below support (SELL)', weight: 0.25 },
      { name: 'Volume', params: { avgPeriod: 20, threshold: 1.5 }, condition: 'Volume > 1.5x average confirms breakout', weight: 0.15 },
    ],
    symbols: ['XAUUSD', 'BTCUSD', 'ETHUSD', 'XRPUSD', 'GBPUSD'],
    timeframes: ['H1', 'H4'],
    riskManagement: {
      maxRiskPercent: 2,
      leverage: 50,
      maxOpenTrades: 3,
      tpMode: 'atr',
      slMode: 'support_resistance',
      fibLevels: [1.618, 2.618],
    },
    isActive: true,
    createdAt: '2026-04-05T08:00:00Z',
  },
];

function normalizeRiskManagement(body: CreateStrategyInput): RiskConfig {
  if (body.riskManagement) return body.riskManagement;
  if (body.risk) {
    const stopLossPct = body.risk.stopLossPct;
    const takeProfitPct = body.risk.takeProfitPct;
    const leverage = Math.max(10, Math.round(body.risk.riskRewardRatio * 10));
    return {
      maxRiskPercent: Math.max(0.25, Math.min(5, stopLossPct)),
      leverage,
      maxOpenTrades: 1,
      tpMode: 'fixed',
      slMode: 'atr',
      fibLevels: [1, Number((takeProfitPct / stopLossPct).toFixed(3))],
    };
  }

  return DEFAULT_RISK;
}

function normalizeStrategy(body: CreateStrategyInput): Strategy {
  const riskManagement = normalizeRiskManagement(body);
  const createdAt = new Date().toISOString();
  const strategy: Strategy = {
    id: `strat-${randomUUID().slice(0, 8)}`,
    name: body.name,
    description: body.description,
    indicators: body.indicators,
    symbols: body.symbols,
    timeframes: body.timeframes,
    riskManagement,
    isActive: body.isActive ?? false,
    createdAt,
  };

  return strategy;
}

export async function GET() {
  try {
    return NextResponse.json({
      count: PRESET_STRATEGIES.length,
      strategies: PRESET_STRATEGIES,
      performanceStatus: PERFORMANCE_STATUS,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    return NextResponse.json({
      strategy: normalizeStrategy(parsed.data as CreateStrategyInput),
      performanceStatus: PERFORMANCE_STATUS,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
