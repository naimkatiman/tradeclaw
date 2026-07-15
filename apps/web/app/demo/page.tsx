import type { Metadata } from 'next';
import DemoClient from './DemoClient';

interface Props {
  searchParams: Promise<{ symbol?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const symbol = params.symbol ?? 'BTCUSD';
  const title = `${symbol} Signal Feed — TradeClaw`;
  const description = `Inspect available TradeClaw rule-based signal candidates for ${symbol}. Scores are not probabilities or portfolio returns.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/api/og/demo?symbol=${symbol}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og/demo?symbol=${symbol}`],
    },
  };
}

export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams;
  return <DemoClient initialSymbol={params.symbol} />;
}
