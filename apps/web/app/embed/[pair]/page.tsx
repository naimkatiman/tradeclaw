import type { Metadata, Viewport } from 'next';
import { SYMBOLS } from '../../lib/signals';
import { EmbedCard } from './EmbedCard';

type Params = { pair: string };
type SearchParams = { theme?: string };

export const viewport: Viewport = {
  width: 320,
  initialScale: 1,
};

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { pair } = await params;
  const upper = pair.toUpperCase();
  const sym = SYMBOLS.find(s => s.symbol === upper);
  const name = sym?.name ?? upper;

  return {
    title: `${upper} Signal Widget — TradeClaw`,
    description: `Live ${name} trading signal widget. Embed free AI signals on your site.`,
    robots: { index: false },
  };
}

export default async function EmbedPairPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ pair }, sp] = await Promise.all([params, searchParams]);
  const theme = sp.theme === 'light' ? 'light' : 'dark';

  return <EmbedCard pair={pair.toUpperCase()} theme={theme} />;
}
