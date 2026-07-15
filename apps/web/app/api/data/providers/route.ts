import { NextResponse } from 'next/server';
import { getProviderRegistry } from '../../../lib/data-providers';

export async function GET() {
  const providers = getProviderRegistry();

  const categories = [...new Set(providers.map((p) => p.category))];
  const summary = {
    total: providers.length,
    configured: providers.filter((p) => p.configured).length,
    unconfigured: providers.filter((p) => !p.configured).length,
    measuredHealthy: providers.filter((p) => p.status === 'ok').length,
    healthMeasured: false,
    needsKey: providers.filter((p) => p.requiresKey).length,
    noKeyNeeded: providers.filter((p) => !p.requiresKey).length,
    byCategory: Object.fromEntries(
      categories.map((cat) => [
        cat,
        {
          total: providers.filter((p) => p.category === cat).length,
          configured: providers.filter((p) => p.category === cat && p.configured).length,
          measuredHealthy: providers.filter((p) => p.category === cat && p.status === 'ok').length,
        },
      ]),
    ),
  };

  return NextResponse.json({
    providers,
    summary,
    note: 'Registry metadata only. Provider health has not been probed by this endpoint.',
    timestamp: new Date().toISOString(),
  });
}
