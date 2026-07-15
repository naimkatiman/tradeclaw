import type { Metadata } from 'next';
import { TradingViewExportClient } from './TradingViewExportClient';

const ogImage = '/api/og/track-record';

export const metadata: Metadata = {
  title: 'Export Track Record for TradingView — TradeClaw',
  description:
    "Export TradeClaw's OHLCV-resolved signal summary for TradingView posts, with its recorded-signal scope and limitations labeled.",
  keywords: [
    'tradingview track record',
    'tradingview profile',
    'signal performance',
    'OHLCV-resolved trading signals',
    'tradeclaw tradingview',
  ],
  openGraph: {
    title: 'Export Track Record for TradingView — TradeClaw',
    description:
      'Recorded signals and OHLCV-resolved outcomes formatted for TradingView. Not broker fills or portfolio returns.',
    url: 'https://tradeclaw.win/tradingview-export',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'TradeClaw Track Record' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Export Track Record for TradingView — TradeClaw',
    description: 'OHLCV-resolved signal statistics formatted for TradingView, with limitations labeled.',
    images: [ogImage],
  },
  alternates: {
    canonical: 'https://tradeclaw.win/tradingview-export',
  },
};

export default function TradingViewExportPage() {
  return <TradingViewExportClient />;
}
