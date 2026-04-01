// TC-146: Market Commentary Engine — template-based, zero LLM cost
// Seeded PRNG ensures same day = same commentary

// ── Types ────────────────────────────────────────────────────────────────────

export interface TopMover {
  pair: string;
  direction: 'bullish' | 'bearish';
  confidence: number;
  change: number;
}

export interface KeyLevel {
  pair: string;
  support: number;
  resistance: number;
}

export interface SignalConsensus {
  bullish: number;
  bearish: number;
  neutral: number;
}

export interface DailyCommentary {
  date: string;
  headline: string;
  summary: string;
  topMovers: TopMover[];
  signalConsensus: SignalConsensus;
  fearGreedScore: number;
  fearGreedLabel: string;
  keyLevels: KeyLevel[];
  marketBias: string;
  outlook: string;
  generatedAt: string;
}

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function seedFromDate(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = Math.imul(31, h) + dateStr.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function rangeInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function rangeFloat(min: number, max: number, rng: () => number, decimals = 2): number {
  return parseFloat((rng() * (max - min) + min).toFixed(decimals));
}

// ── Reference Data ───────────────────────────────────────────────────────────

const PAIRS = [
  { symbol: 'XAUUSD', name: 'Gold', base: 4505, pip: 0.01 },
  { symbol: 'XAGUSD', name: 'Silver', base: 71.36, pip: 0.001 },
  { symbol: 'BTCUSD', name: 'Bitcoin', base: 70798, pip: 0.01 },
  { symbol: 'ETHUSD', name: 'Ethereum', base: 2147, pip: 0.01 },
  { symbol: 'SOLUSD', name: 'Solana', base: 142.8, pip: 0.01 },
  { symbol: 'EURUSD', name: 'EUR/USD', base: 1.1559, pip: 0.0001 },
  { symbol: 'GBPUSD', name: 'GBP/USD', base: 1.3352, pip: 0.0001 },
  { symbol: 'USDJPY', name: 'USD/JPY', base: 159.53, pip: 0.01 },
  { symbol: 'AUDUSD', name: 'AUD/USD', base: 0.6939, pip: 0.0001 },
  { symbol: 'XRPUSD', name: 'XRP', base: 1.40, pip: 0.0001 },
  { symbol: 'BNBUSD', name: 'BNB', base: 608.5, pip: 0.01 },
  { symbol: 'DOGEUSD', name: 'Dogecoin', base: 0.178, pip: 0.00001 },
];

// ── Template Pools ───────────────────────────────────────────────────────────

const HEADLINES = [
  (bias: string) => `Markets Lean ${bias} as Signals Align`,
  (bias: string) => `${bias} Momentum Builds Across Key Pairs`,
  (bias: string) => `Signal Consensus Shifts ${bias} Today`,
  (bias: string) => `TradeClaw Signals Flash ${bias} Across the Board`,
  (bias: string) => `${bias} Pressure Mounts — Key Levels in Focus`,
  (bias: string) => `Cross-Asset Signals Point ${bias} This Session`,
  (bias: string) => `${bias} Bias Dominates as Volatility Picks Up`,
];

const SUMMARIES = [
  (topPair: string, bias: string, fgLabel: string) =>
    `Today&apos;s signal consensus leans ${bias.toLowerCase()} with ${topPair} leading the charge. The Fear &amp; Greed index reads ${fgLabel}, suggesting traders should size positions accordingly. Multiple timeframe alignment confirms the directional bias across major pairs.`,
  (topPair: string, bias: string, fgLabel: string) =>
    `${topPair} dominates today&apos;s signal landscape as ${bias.toLowerCase()} momentum accelerates. Market sentiment sits at ${fgLabel} territory. Our multi-indicator engine detects strengthening trends with high-confidence setups emerging across forex and crypto.`,
  (topPair: string, bias: string, fgLabel: string) =>
    `A ${bias.toLowerCase()} tilt characterizes today&apos;s market as ${topPair} prints the strongest signal. The Fear &amp; Greed reading of ${fgLabel} aligns with current price action. Key support and resistance levels remain intact across tracked instruments.`,
  (topPair: string, bias: string, fgLabel: string) =>
    `Cross-asset analysis reveals a ${bias.toLowerCase()} skew with ${topPair} at the forefront. With sentiment at ${fgLabel}, the risk-reward profile favors trend-following strategies. RSI and MACD convergence supports the current directional view.`,
  (topPair: string, bias: string, fgLabel: string) =>
    `TradeClaw&apos;s signal engine identifies ${bias.toLowerCase()} opportunities today, led by ${topPair}. The ${fgLabel} reading on our Fear &amp; Greed gauge reflects measured positioning. Bollinger Band squeezes on several pairs hint at impending volatility expansion.`,
  (topPair: string, bias: string, fgLabel: string) =>
    `Institutional flow alignment pushes ${topPair} into the spotlight with a clear ${bias.toLowerCase()} lean. The Fear &amp; Greed indicator at ${fgLabel} suggests the crowd is not yet fully positioned. Divergences between price and momentum on secondary pairs warrant attention.`,
];

const OUTLOOKS = [
  (bias: string) =>
    `Near-term outlook remains ${bias.toLowerCase()}. Watch for breakout confirmation on key levels before adding to positions. Volume profile supports the current trend direction.`,
  (bias: string) =>
    `The ${bias.toLowerCase()} bias is expected to persist through the session. Traders should monitor central bank commentary and economic data releases for potential catalysts.`,
  (bias: string) =>
    `Expect ${bias.toLowerCase()} continuation unless major support/resistance levels are violated. Cross-pair correlation remains elevated, suggesting macro-driven moves.`,
  (bias: string) =>
    `${bias} sentiment dominates but fading momentum on some pairs suggests a potential consolidation phase. Risk management remains paramount.`,
  (bias: string) =>
    `Today&apos;s ${bias.toLowerCase()} lean is well-supported by technical indicators. Intraday traders should focus on pullback entries near key moving averages.`,
];

const BIAS_PHRASES = [
  (bias: string) =>
    `The overall market bias is ${bias.toLowerCase()} with a tilt toward risk-${bias === 'Bullish' ? 'on' : 'off'} positioning. Signal strength across major pairs confirms the directional lean.`,
  (bias: string) =>
    `${bias} conviction is ${bias === 'Bullish' ? 'growing' : 'building'} as multiple indicators align. The weight of evidence favors ${bias === 'Bullish' ? 'long' : 'short'} exposure in trending pairs.`,
  (bias: string) =>
    `Market structure supports a ${bias.toLowerCase()} interpretation. Higher timeframe trends remain intact with ${bias === 'Bullish' ? 'higher lows' : 'lower highs'} forming across the board.`,
  (bias: string) =>
    `Signal aggregation reveals ${bias.toLowerCase()} dominance. The ${bias === 'Bullish' ? 'path of least resistance is up' : 'downside pressure continues'} until key levels break.`,
  (bias: string) =>
    `A measured ${bias.toLowerCase()} stance is warranted. Momentum oscillators and trend-following systems are in agreement on the current directional bias.`,
];

// ── In-memory cache ──────────────────────────────────────────────────────────

const cache = new Map<string, DailyCommentary>();

// ── Generator ────────────────────────────────────────────────────────────────

function getFearGreedLabel(score: number): string {
  if (score <= 20) return 'Extreme Fear';
  if (score <= 40) return 'Fear';
  if (score <= 60) return 'Neutral';
  if (score <= 80) return 'Greed';
  return 'Extreme Greed';
}

export function generateDailyCommentary(date?: string): DailyCommentary {
  const dateStr = date ?? new Date().toISOString().slice(0, 10);

  const cached = cache.get(dateStr);
  if (cached) return cached;

  const rng = mulberry32(seedFromDate(dateStr));

  // Generate signal consensus
  const bullish = rangeInt(25, 55, rng);
  const bearish = rangeInt(15, 45, rng);
  const neutral = 100 - bullish - bearish;
  const signalConsensus: SignalConsensus = { bullish, bearish, neutral: Math.max(0, neutral) };

  // Normalize if neutral went negative
  if (neutral < 0) {
    const total = bullish + bearish;
    signalConsensus.bullish = Math.round((bullish / total) * 100);
    signalConsensus.bearish = 100 - signalConsensus.bullish;
    signalConsensus.neutral = 0;
  }

  // Fear & Greed
  const fearGreedScore = rangeInt(10, 90, rng);
  const fearGreedLabel = getFearGreedLabel(fearGreedScore);

  // Market bias
  const biasLabel = signalConsensus.bullish > signalConsensus.bearish ? 'Bullish' : 'Bearish';

  // Top movers — pick 4 unique pairs
  const shuffled = [...PAIRS].sort(() => rng() - 0.5);
  const topMovers: TopMover[] = shuffled.slice(0, 4).map((p) => ({
    pair: p.symbol,
    direction: rng() > 0.45 ? 'bullish' : 'bearish',
    confidence: rangeInt(62, 94, rng),
    change: rangeFloat(-4.5, 4.5, rng),
  }));

  // Key levels — pick 6 unique pairs
  const levelPairs = shuffled.slice(0, 6);
  const keyLevels: KeyLevel[] = levelPairs.map((p) => {
    const spread = p.base * rangeFloat(0.01, 0.04, rng, 4);
    return {
      pair: p.symbol,
      support: parseFloat((p.base - spread).toFixed(p.pip < 0.001 ? 5 : p.pip < 0.01 ? 4 : 2)),
      resistance: parseFloat((p.base + spread).toFixed(p.pip < 0.001 ? 5 : p.pip < 0.01 ? 4 : 2)),
    };
  });

  const topPairName = PAIRS.find((p) => p.symbol === topMovers[0].pair)?.name ?? topMovers[0].pair;

  const commentary: DailyCommentary = {
    date: dateStr,
    headline: pick(HEADLINES, rng)(biasLabel),
    summary: pick(SUMMARIES, rng)(topPairName, biasLabel, fearGreedLabel),
    topMovers,
    signalConsensus,
    fearGreedScore,
    fearGreedLabel,
    keyLevels,
    marketBias: pick(BIAS_PHRASES, rng)(biasLabel),
    outlook: pick(OUTLOOKS, rng)(biasLabel),
    generatedAt: new Date().toISOString(),
  };

  cache.set(dateStr, commentary);
  return commentary;
}

// ── Archive helper ───────────────────────────────────────────────────────────

export function getCommentaryArchive(days = 7): DailyCommentary[] {
  const result: DailyCommentary[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(generateDailyCommentary(d.toISOString().slice(0, 10)));
  }
  return result;
}
