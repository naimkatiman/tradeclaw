import type { Metadata } from 'next';
import { HowItWorksClient } from './HowItWorksClient';

export const metadata: Metadata = {
  title: 'How TradeClaw Works | Signal Engine Explained',
  description: 'Complete transparency on how TradeClaw generates trading signals — exact scoring formula, indicator weights, code snippets, and live worked examples.',
  openGraph: {
    title: 'How TradeClaw Signals Work — Full Transparency',
    description: 'The exact formula, indicator weights, and code behind every TradeClaw signal. No black boxes.',
  },
  keywords: [
    'trading signal algorithm', 'RSI MACD EMA explained', 'how trading signals work',
    'open source trading algorithm', 'confidence score formula', 'technical analysis explained',
  ],
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
