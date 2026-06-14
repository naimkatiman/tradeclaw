import type { Metadata } from 'next';
import { FreeSignalsClient } from './FreeSignalsClient';
import { getTrackedSignals } from '../../lib/tracked-signals';
import { applyTierSignalVisibility, getStrategiesForTier } from '../../lib/tier';
import { WATCHLIST_MIN_CONFIDENCE } from '../../lib/signal-thresholds';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Free Trading Signals — Live AI Signals for Crypto, Forex & Gold | TradeClaw',
  description:
    'Get free trading signals powered by AI technical analysis. Real-time BUY/SELL alerts for BTC, ETH, XAUUSD, EURUSD and 20+ markets. No credit card required.',
  keywords: [
    'free trading signals',
    'free forex signals',
    'free crypto signals',
    'AI trading signals',
    'technical analysis signals',
    'XAUUSD signals',
    'BTC trading signals',
    'EURUSD signals',
  ],
  openGraph: {
    title: 'Free Trading Signals — Live AI Signals for Crypto, Forex & Gold',
    description:
      'Real-time BUY/SELL alerts for 20+ markets. Powered by RSI, MACD, EMA confluence scoring. No credit card required.',
    url: 'https://tradeclaw.win/free-signals',
    type: 'website',
  },
  alternates: {
    canonical: 'https://tradeclaw.win/free-signals',
  },
};

export default async function FreeSignalsPage() {
  let initialSignals: Awaited<ReturnType<typeof getTrackedSignals>>['signals'] = [];
  try {
    const result = await getTrackedSignals({
      minConfidence: WATCHLIST_MIN_CONFIDENCE,
      ctx: { tier: 'free', unlockedStrategies: getStrategiesForTier('free') },
    });
    initialSignals = applyTierSignalVisibility(result.signals, 'free').visible;
  } catch {
    // Fall through with empty array — client will re-fetch
  }

  return <FreeSignalsClient initialSignals={initialSignals} />;
}
