import type { Metadata } from 'next';
import { SYMBOLS } from '../../lib/symbol-config';
import ChartClient from './ChartClient';

type Params = { symbol: string };

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { symbol } = await params;
  const config = SYMBOLS.find((s) => s.symbol === symbol.toUpperCase());
  const name = config?.name ?? symbol;
  return {
    title: `${symbol.toUpperCase()} Chart — TradeClaw`,
    description: `Live interactive chart for ${name}. Free open-source trading platform.`,
  };
}

export default async function ChartPage(
  { params }: { params: Promise<Params> }
) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const valid = SYMBOLS.some((s) => s.symbol === upper);

  return <ChartClient symbol={valid ? upper : SYMBOLS[0].symbol} />;
}
