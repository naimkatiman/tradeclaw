import { NextResponse } from 'next/server';
import { getProviders } from '../../../../lib/marketplace-providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const providers = await getProviders(50);
    return NextResponse.json({
      providers,
      total: providers.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to load providers' },
      { status: 500 },
    );
  }
}
