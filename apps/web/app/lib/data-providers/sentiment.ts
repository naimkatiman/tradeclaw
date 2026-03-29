/**
 * Sentiment Data Provider — Fear & Greed Index
 * https://api.alternative.me/fng/ — no key, no limits
 */

import { type SentimentData, safeFetch } from './types';

// ─── Crypto Fear & Greed Index ─────────────────────────────────────────────

interface FNGEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

export async function fetchFearGreedIndex(
  limit: number = 1,
): Promise<SentimentData[]> {
  const data = await safeFetch<{ data: FNGEntry[] }>(
    `https://api.alternative.me/fng/?limit=${limit}&format=json`,
  );
  if (!data?.data) return [];

  return data.data.map((d) => ({
    value: parseInt(d.value, 10),
    label: d.value_classification,
    timestamp: parseInt(d.timestamp, 10) * 1000,
    source: 'alternative.me',
  }));
}

export async function fetchFearGreedHistory(
  days: number = 365,
): Promise<SentimentData[]> {
  return fetchFearGreedIndex(days);
}

/**
 * Interpret sentiment value into trading context
 */
export function interpretSentiment(value: number): {
  label: string;
  bias: 'bullish' | 'bearish' | 'neutral';
  description: string;
} {
  if (value <= 20) {
    return {
      label: 'Extreme Fear',
      bias: 'bullish', // Contrarian: extreme fear = potential buy
      description: 'Market is in extreme fear — historically a contrarian buy signal',
    };
  }
  if (value <= 40) {
    return {
      label: 'Fear',
      bias: 'bullish',
      description: 'Market sentiment is fearful — may present buying opportunities',
    };
  }
  if (value <= 60) {
    return {
      label: 'Neutral',
      bias: 'neutral',
      description: 'Market sentiment is balanced — no strong directional bias',
    };
  }
  if (value <= 80) {
    return {
      label: 'Greed',
      bias: 'bearish',
      description: 'Market sentiment is greedy — exercise caution on new longs',
    };
  }
  return {
    label: 'Extreme Greed',
    bias: 'bearish', // Contrarian: extreme greed = potential top
    description: 'Market is in extreme greed — historically a contrarian sell signal',
  };
}
