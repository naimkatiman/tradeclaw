import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';
import { getTrackedSignals } from '../../../lib/tracked-signals';
import { resolveAccessContextFromCookies } from '../../../lib/tier';
import { AlertDetailClient } from './AlertDetailClient';

type Params = { id: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params;
  const parts = id.toUpperCase().split('-');
  const direction = parts[parts.length - 1];
  const timeframe = parts[parts.length - 2];
  const symbol = parts.slice(0, parts.length - 2).join('-');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradeclaw.com';
  const ogUrl = `${baseUrl}/api/og/signal/${id}`;
  const pageUrl = `${baseUrl}/alert/${id}`;

  const title = `🚨 ${symbol} ${direction} Alert — ${timeframe} | TradeClaw`;
  const description = `AI-generated ${direction} signal for ${symbol} on ${timeframe} timeframe. Tap to view entry, stop loss & take profit levels. Free open-source trading signals.`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'TradeClaw',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${symbol} ${direction} signal` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl],
    },
    other: {
      // WhatsApp + Telegram use og: tags above
      'og:image:width': '1200',
      'og:image:height': '630',
    },
  };
}

export default async function AlertPage(
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const parts = id.toUpperCase().split('-');

  if (parts.length < 3) notFound();

  const direction = parts[parts.length - 1] as 'BUY' | 'SELL';
  const timeframe = parts[parts.length - 2];
  const symbol = parts.slice(0, parts.length - 2).join('-');

  if (direction !== 'BUY' && direction !== 'SELL') notFound();

  const ctx = await resolveAccessContextFromCookies();
  const { signals } = await getTrackedSignals({ symbol, timeframe, direction, ctx });
  if (signals.length === 0) notFound();

  const signal = signals[0];

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white">
      {/* Minimal nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 shrink-0">
            <TradeClawLogo className="h-4 w-4 shrink-0" id="alert" />
            <span className="text-sm font-semibold">
              Trade<span className="text-emerald-400">Claw</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            All Signals →
          </Link>
        </div>
      </nav>

      <AlertDetailClient signal={signal} id={id} />
    </div>
  );
}
