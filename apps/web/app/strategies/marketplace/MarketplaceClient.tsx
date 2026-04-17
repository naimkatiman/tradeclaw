'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, ArrowRight } from 'lucide-react';
import { PageNavBar } from '../../../components/PageNavBar';

type Category = 'Trend' | 'Momentum' | 'Reversal' | 'Volatility' | 'Volume';

interface StrategyBlock {
  id: string;
  type: 'IF' | 'AND' | 'THEN';
  condition?: {
    indicator: string;
    operator: string;
    value: number;
  };
  action?: {
    type: string;
    param?: number;
  };
}

interface MarketplaceStrategy {
  name: string;
  category: Category;
  description: string;
  indicators: string[];
  rating: number;
  reviews: number;
  winRate: number;
  blocks: StrategyBlock[];
}

const CATEGORIES: Array<'All' | Category> = ['All', 'Trend', 'Momentum', 'Reversal', 'Volatility', 'Volume'];

const CATEGORY_COLORS: Record<Category, string> = {
  Trend: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Momentum: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Reversal: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Volatility: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Volume: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

const STRATEGIES: MarketplaceStrategy[] = [
  {
    name: 'EMA Ribbon Trend Follow',
    category: 'Trend',
    description: 'Uses EMA 20/50/200 alignment to identify strong trending markets and enter in the direction of the trend.',
    indicators: ['EMA 20', 'EMA 50', 'EMA 200'],
    rating: 4.5,
    reviews: 127,
    winRate: 68,
    blocks: [
      { id: 'e1', type: 'IF', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'e2', type: 'AND', condition: { indicator: 'RSI', operator: '>', value: 50 } },
      { id: 'e3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'RSI Divergence Reversal',
    category: 'Reversal',
    description: 'Detects bullish and bearish divergence between RSI and price action for high-probability reversal entries.',
    indicators: ['RSI', 'Price Action'],
    rating: 4.2,
    reviews: 89,
    winRate: 62,
    blocks: [
      { id: 'r1', type: 'IF', condition: { indicator: 'RSI', operator: '<', value: 35 } },
      { id: 'r2', type: 'AND', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 0.5 } },
      { id: 'r3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'MACD Zero-Cross',
    category: 'Momentum',
    description: 'Enters when MACD crosses above or below the zero line, confirming momentum shift with histogram direction.',
    indicators: ['MACD', 'Signal Line'],
    rating: 4.0,
    reviews: 156,
    winRate: 59,
    blocks: [
      { id: 'm1', type: 'IF', condition: { indicator: 'MACD', operator: 'crosses_above', value: 0 } },
      { id: 'm2', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Bollinger Band Squeeze',
    category: 'Volatility',
    description: 'Identifies low-volatility squeezes in Bollinger Bands and enters on the breakout with RSI confirmation.',
    indicators: ['Bollinger Bands', 'RSI'],
    rating: 4.3,
    reviews: 74,
    winRate: 65,
    blocks: [
      { id: 'bb1', type: 'IF', condition: { indicator: 'BB', operator: '<', value: 20 } },
      { id: 'bb2', type: 'AND', condition: { indicator: 'RSI', operator: '>', value: 55 } },
      { id: 'bb3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Ichimoku Cloud Breakout',
    category: 'Trend',
    description: 'Enters when price breaks above the Ichimoku cloud with EMA alignment for trend continuation trades.',
    indicators: ['Ichimoku', 'EMA'],
    rating: 4.4,
    reviews: 63,
    winRate: 66,
    blocks: [
      { id: 'ic1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 1.0 } },
      { id: 'ic2', type: 'AND', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'ic3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'VWAP Bounce',
    category: 'Volume',
    description: 'Trades bounces off the Volume Weighted Average Price level with RSI oversold confirmation for intraday entries.',
    indicators: ['VWAP', 'RSI'],
    rating: 4.1,
    reviews: 47,
    winRate: 61,
    blocks: [
      { id: 'vw1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '<', value: -0.3 } },
      { id: 'vw2', type: 'AND', condition: { indicator: 'RSI', operator: '<', value: 40 } },
      { id: 'vw3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Golden Cross',
    category: 'Trend',
    description: 'Classic EMA 50/200 crossover strategy. Enters long when the 50 EMA crosses above the 200 EMA on higher timeframes.',
    indicators: ['EMA 50', 'EMA 200'],
    rating: 4.6,
    reviews: 203,
    winRate: 71,
    blocks: [
      { id: 'gc1', type: 'IF', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'gc2', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'RSI Oversold Bounce',
    category: 'Reversal',
    description: 'Enters long when RSI drops below 30 and starts recovering, targeting mean reversion with MACD confirmation.',
    indicators: ['RSI', 'MACD'],
    rating: 4.3,
    reviews: 112,
    winRate: 64,
    blocks: [
      { id: 'ro1', type: 'IF', condition: { indicator: 'RSI', operator: '<', value: 30 } },
      { id: 'ro2', type: 'AND', condition: { indicator: 'MACD', operator: '>', value: 0 } },
      { id: 'ro3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Stochastic Overbought',
    category: 'Reversal',
    description: 'Shorts when Stochastic %K rises above 80 and crosses below the signal line, catching overbought reversals.',
    indicators: ['Stochastic %K', 'Signal'],
    rating: 3.9,
    reviews: 58,
    winRate: 57,
    blocks: [
      { id: 'so1', type: 'IF', condition: { indicator: 'STOCH', operator: '>', value: 80 } },
      { id: 'so2', type: 'THEN', action: { type: 'ENTRY_SHORT' } },
    ],
  },
  {
    name: 'Triple EMA Alignment',
    category: 'Trend',
    description: 'Requires EMA 5/10/20 to be in perfect bullish alignment before entering, filtering out choppy markets.',
    indicators: ['EMA 5', 'EMA 10', 'EMA 20'],
    rating: 4.1,
    reviews: 86,
    winRate: 63,
    blocks: [
      { id: 'te1', type: 'IF', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'te2', type: 'AND', condition: { indicator: 'RSI', operator: '>', value: 55 } },
      { id: 'te3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Fibonacci Retracement',
    category: 'Reversal',
    description: 'Enters at key Fibonacci levels (38.2%, 50%, 61.8%) with RSI confirmation for pullback reversal trades.',
    indicators: ['Fibonacci', 'RSI'],
    rating: 4.0,
    reviews: 71,
    winRate: 60,
    blocks: [
      { id: 'fb1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '<', value: -1.5 } },
      { id: 'fb2', type: 'AND', condition: { indicator: 'RSI', operator: '<', value: 45 } },
      { id: 'fb3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'ATR Breakout',
    category: 'Volatility',
    description: 'Enters when price moves beyond 2x ATR from the mean, indicating strong volatility expansion and breakout.',
    indicators: ['ATR', 'Price Action'],
    rating: 4.2,
    reviews: 54,
    winRate: 64,
    blocks: [
      { id: 'at1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 2.0 } },
      { id: 'at2', type: 'AND', condition: { indicator: 'RSI', operator: '>', value: 60 } },
      { id: 'at3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'MACD Histogram Momentum',
    category: 'Momentum',
    description: 'Trades based on MACD histogram direction changes, entering when histogram turns positive with rising bars.',
    indicators: ['MACD', 'Histogram'],
    rating: 3.8,
    reviews: 92,
    winRate: 56,
    blocks: [
      { id: 'mh1', type: 'IF', condition: { indicator: 'MACD', operator: '>', value: 0 } },
      { id: 'mh2', type: 'AND', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 0.2 } },
      { id: 'mh3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'RSI + MACD Confluence',
    category: 'Momentum',
    description: 'Dual confirmation strategy requiring both RSI above 50 and MACD above zero for high-conviction momentum entries.',
    indicators: ['RSI', 'MACD'],
    rating: 4.4,
    reviews: 134,
    winRate: 69,
    blocks: [
      { id: 'rm1', type: 'IF', condition: { indicator: 'RSI', operator: '>', value: 50 } },
      { id: 'rm2', type: 'AND', condition: { indicator: 'MACD', operator: '>', value: 0 } },
      { id: 'rm3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Donchian Channel Breakout',
    category: 'Trend',
    description: 'Classic turtle trading system. Enters on 20-period high breakout with price action confirmation for trend entries.',
    indicators: ['Donchian', 'Price Action'],
    rating: 4.1,
    reviews: 67,
    winRate: 62,
    blocks: [
      { id: 'dc1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 1.5 } },
      { id: 'dc2', type: 'AND', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'dc3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Williams %R Reversal',
    category: 'Reversal',
    description: 'Enters when Williams %R reaches extreme oversold levels below -80 and starts recovering for mean reversion.',
    indicators: ['Williams %R', 'Stochastic'],
    rating: 3.7,
    reviews: 43,
    winRate: 55,
    blocks: [
      { id: 'wr1', type: 'IF', condition: { indicator: 'STOCH', operator: '<', value: 20 } },
      { id: 'wr2', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Parabolic SAR Trend',
    category: 'Trend',
    description: 'Follows the Parabolic SAR flip signal for trend direction with EMA cross confirmation to filter false signals.',
    indicators: ['Parabolic SAR', 'EMA'],
    rating: 4.0,
    reviews: 78,
    winRate: 60,
    blocks: [
      { id: 'ps1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 0.5 } },
      { id: 'ps2', type: 'AND', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'ps3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'CCI Extreme Reversal',
    category: 'Reversal',
    description: 'Trades CCI extreme readings below -100 or above +100 as reversal signals with price action confirmation.',
    indicators: ['CCI', 'Price Action'],
    rating: 3.8,
    reviews: 51,
    winRate: 58,
    blocks: [
      { id: 'cc1', type: 'IF', condition: { indicator: 'PRICE_ACTION', operator: '<', value: -1.0 } },
      { id: 'cc2', type: 'AND', condition: { indicator: 'RSI', operator: '<', value: 35 } },
      { id: 'cc3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Elder Ray Bull Power',
    category: 'Trend',
    description: 'Uses Elder Ray bull/bear power indicators with EMA trend filter to identify strong directional momentum.',
    indicators: ['Elder Ray', 'EMA', 'MACD'],
    rating: 4.2,
    reviews: 39,
    winRate: 66,
    blocks: [
      { id: 'er1', type: 'IF', condition: { indicator: 'MACD', operator: '>', value: 0 } },
      { id: 'er2', type: 'AND', condition: { indicator: 'EMA_CROSS', operator: 'crosses_above', value: 0 } },
      { id: 'er3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
  {
    name: 'Keltner Channel Breakout',
    category: 'Volatility',
    description: 'Enters on Keltner Channel breakout with Bollinger Band squeeze confirmation for volatility expansion trades.',
    indicators: ['Keltner', 'Bollinger Bands'],
    rating: 4.1,
    reviews: 46,
    winRate: 63,
    blocks: [
      { id: 'kc1', type: 'IF', condition: { indicator: 'BB', operator: '<', value: 15 } },
      { id: 'kc2', type: 'AND', condition: { indicator: 'PRICE_ACTION', operator: '>', value: 1.0 } },
      { id: 'kc3', type: 'THEN', action: { type: 'ENTRY_LONG' } },
    ],
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i <= Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : i - 0.5 <= rating
                ? 'fill-yellow-400/50 text-yellow-400'
                : 'text-[var(--border)]'
          }`}
        />
      ))}
    </div>
  );
}

export function MarketplaceClient() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<'All' | Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const filtered = STRATEGIES.filter((s) => {
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const loadStrategy = (strategy: MarketplaceStrategy) => {
    const payload = {
      name: strategy.name,
      blocks: strategy.blocks,
    };
    const encoded = btoa(JSON.stringify(payload));
    setLoadedId(strategy.name);
    setTimeout(() => {
      router.push(`/strategy-builder?import=${encoded}`);
    }, 600);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Strategy <span className="text-emerald-400">Marketplace</span>
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            Browse 20+ community strategies. One-click load into the Strategy Builder.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                  activeCategory === cat
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--foreground)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg text-xs text-[var(--foreground)] outline-none focus:border-emerald-500/30 placeholder:text-[var(--text-secondary)]"
            />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[var(--text-secondary)]">
            No strategies match your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((strategy) => (
              <div
                key={strategy.name}
                className="bg-[var(--glass-bg)] rounded-2xl border border-[var(--border)] p-5 flex flex-col gap-3 hover:border-emerald-500/20 transition-all"
              >
                {/* Category badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[strategy.category]}`}>
                    {strategy.category}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    strategy.winRate >= 65
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : strategy.winRate >= 55
                        ? 'bg-zinc-500/15 text-zinc-400'
                        : 'bg-red-500/15 text-red-400'
                  }`}>
                    {strategy.winRate}% win rate
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold text-[var(--foreground)] leading-tight">
                  {strategy.name}
                </h3>

                {/* Description */}
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {strategy.description}
                </p>

                {/* Indicator chips */}
                <div className="flex flex-wrap gap-1">
                  {strategy.indicators.map((ind) => (
                    <span
                      key={ind}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      {ind}
                    </span>
                  ))}
                </div>

                {/* Rating + reviews */}
                <div className="flex items-center gap-2">
                  <StarRating rating={strategy.rating} />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {strategy.rating.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    ({strategy.reviews} reviews)
                  </span>
                </div>

                {/* Load button */}
                <button
                  onClick={() => loadStrategy(strategy)}
                  className={`mt-auto w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.98] border flex items-center justify-center gap-1.5 ${
                    loadedId === strategy.name
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {loadedId === strategy.name ? (
                    'Strategy loaded!'
                  ) : (
                    <>
                      Load Strategy
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
