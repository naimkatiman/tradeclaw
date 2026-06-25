import type { Metadata } from 'next';
import { TradingViewExportClient } from './TradingViewExportClient';

const ogImage = '/api/og/track-record';

export const metadata: Metadata = {
  title: 'Export Track Record for TradingView — TradeClaw',
  description:
    "Copy TradeClaw's verified signal track record formatted for TradingView ideas and profile posts. Transparent performance data, no cherry-picking.",
  keywords: [
    'tradingview track record',
    'tradingview profile',
    'signal performance',
    'verified trading signals',
    'tradeclaw tradingview',
  ],
  openGraph: {
    title: 'Export Track Record for TradingView — TradeClaw',
    description:
      'Verified signal performance formatted for TradingView. Copy, paste, and publish.',
    url: 'https://tradeclaw.win/tradingview-export',
    type: 'website',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'TradeClaw Track Record' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Export Track Record for TradingView — TradeClaw',
    description: 'Verified signal performance formatted for TradingView.',
    images: [ogImage],
  },
  alternates: {
    canonical: 'https://tradeclaw.win/tradingview-export',
  },
};

export default function TradingViewExportPage() {
  return <TradingViewExportClient />;
}
