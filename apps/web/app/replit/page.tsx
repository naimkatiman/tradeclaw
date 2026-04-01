import type { Metadata } from 'next';
import { ReplitClient } from './ReplitClient';

export const metadata: Metadata = {
  title: 'Run on Replit | TradeClaw',
  description:
    'Fork and run TradeClaw — the open-source AI trading signal platform — on Replit in one click. No local install required. Live signals, backtest engine, and full dashboard in your browser.',
  keywords: ['replit', 'trading signals', 'fork on replit', 'run on replit', 'open source trading', 'tradeclaw'],
  openGraph: {
    title: 'Run TradeClaw on Replit — Zero Install',
    description: 'Fork TradeClaw on Replit and get a live trading signal dashboard in minutes. No CLI, no config.',
    url: 'https://tradeclaw.win/replit',
  },
  alternates: {
    canonical: 'https://tradeclaw.win/replit',
  },
};

export default function ReplitPage() {
  return <ReplitClient />;
}
