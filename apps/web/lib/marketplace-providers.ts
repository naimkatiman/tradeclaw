import 'server-only';
import { query } from './db-pool';

export interface SignalProvider {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  website: string | null;
  verified: boolean;
  createdAt: string;
}

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  website: string | null;
  verified: boolean;
  created_at: string;
}

const SEED_PROVIDERS: SignalProvider[] = [
  {
    id: 'seed-zaky',
    slug: 'zaky',
    name: 'Zaky',
    bio: 'Founder of TradeClaw. TradingView strategy developer specializing in EMA21 + VWAP + RSI confluence across Scalper, Intraday, and Swing timeframes.',
    website: 'https://tradeclaw.win',
    verified: true,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'seed-alpha-desk',
    slug: 'alpha-desk',
    name: 'Alpha Desk',
    bio: 'Quantitative signal desk focused on crypto majors and XAUUSD. Multi-timeframe confluence with strict risk management.',
    website: null,
    verified: true,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'seed-forex-flow',
    slug: 'forex-flow',
    name: 'Forex Flow',
    bio: 'Forex specialist covering EURUSD, GBPUSD, and USDJPY with macro-aligned technical setups.',
    website: null,
    verified: false,
    createdAt: '2026-04-10T00:00:00Z',
  },
];

export async function getProviders(limit = 50): Promise<SignalProvider[]> {
  const rows = await query<ProviderRow>(
    `SELECT id, slug, name, bio, website, verified, created_at
     FROM signal_providers
     ORDER BY verified DESC, created_at DESC
     LIMIT $1`,
    [Math.min(limit, 200)],
  );
  const providers = rows.map(rowToProvider);
  // Return seed data when no real providers exist yet (demo / self-host fallback)
  return providers.length > 0 ? providers : SEED_PROVIDERS.slice(0, limit);
}

export async function getProviderBySlug(slug: string): Promise<SignalProvider | null> {
  const rows = await query<ProviderRow>(
    `SELECT id, slug, name, bio, website, verified, created_at
     FROM signal_providers
     WHERE slug = $1
     LIMIT 1`,
    [slug],
  );
  return rows.length > 0 ? rowToProvider(rows[0]) : null;
}

function rowToProvider(r: ProviderRow): SignalProvider {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    bio: r.bio,
    website: r.website,
    verified: r.verified,
    createdAt: r.created_at,
  };
}
