import { NextResponse } from 'next/server';
import { getProviderRegistry } from '../../../lib/data-providers';

export async function GET() {
  const providers = getProviderRegistry();

  const categories = [...new Set(providers.map((p) => p.category))];
  const summary = {
    total: providers.length,
    active: providers.filter((p) => p.status === 'ok').length,
    needsKey: providers.filter((p) => p.requiresKey).length,
    noKeyNeeded: providers.filter((p) => !p.requiresKey).length,
    byCategory: Object.fromEntries(
      categories.map((cat) => [
        cat,
        {
          total: providers.filter((p) => p.category === cat).length,
          active: providers.filter((p) => p.category === cat && p.status === 'ok').length,
        },
      ]),
    ),
  };

  return NextResponse.json({
    providers,
    summary,
    timestamp: new Date().toISOString(),
  });
}
