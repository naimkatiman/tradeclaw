import type { Metadata } from 'next';
import ConfidenceClient from './ConfidenceClient';

export const metadata: Metadata = {
  title: 'Confidence Score Calculator | How TradeClaw Scores Signals',
  description:
    'Interactive slider tool showing exactly how TradeClaw computes signal confidence scores. Drag the indicators and watch the algorithm score your setup in real time.',
  keywords: [
    'trading signal confidence',
    'RSI MACD EMA scoring',
    'algorithmic trading signal score',
    'how tradeclaw works',
    'confidence calculator',
  ],
  openGraph: {
    title: 'Confidence Score Calculator — TradeClaw',
    description:
      'Interactive tool: drag RSI/MACD/EMA sliders and see exactly how TradeClaw scores a trading signal.',
    type: 'website',
  },
};

export default function ConfidencePage() {
  return <ConfidenceClient />;
}
