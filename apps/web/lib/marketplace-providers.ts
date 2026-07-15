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

export async function getProviders(limit = 50): Promise<SignalProvider[]> {
  const rows = await query<ProviderRow>(
    `SELECT id, slug, name, bio, website, verified, created_at
     FROM signal_providers
     ORDER BY verified DESC, created_at DESC
     LIMIT $1`,
    [Math.min(limit, 200)],
  );
  return rows.map(rowToProvider);
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
