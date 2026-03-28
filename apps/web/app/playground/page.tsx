import type { Metadata } from 'next';
import { PlaygroundClient } from './PlaygroundClient';

export const metadata: Metadata = {
  title: 'Live Playground — TradeClaw Signal Engine',
  description:
    'Run the TradeClaw signal engine in your browser. No install, no clone. Interactive TypeScript playground with RSI, MACD, EMA calculations.',
  openGraph: {
    title: 'TradeClaw Signal Engine Playground',
    description: 'Try the RSI/MACD/EMA scoring algorithm live in your browser. No setup required.',
    type: 'website',
  },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
