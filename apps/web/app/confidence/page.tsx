import type { Metadata } from 'next';
import ConfidenceClient from './ConfidenceClient';

export const metadata: Metadata = {
  title: 'Illustrative Confidence Calculator | TradeClaw',
  description:
    'Explore a simplified weighted confidence formula. This educational calculator is not the canonical formula for every strategy and does not authorize alerts or execution.',
  keywords: [
    'trading signal confidence',
    'RSI MACD EMA scoring',
    'algorithmic trading signal score',
    'how tradeclaw works',
    'confidence calculator',
  ],
  openGraph: {
    title: 'Illustrative Confidence Calculator - TradeClaw',
    description:
      'A simplified educational score model. Confidence alone never authorizes TradeClaw alert delivery or broker execution.',
    type: 'website',
  },
};

export default function ConfidencePage() {
  return <ConfidenceClient />;
}
