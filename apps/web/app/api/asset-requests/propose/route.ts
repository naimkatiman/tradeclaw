import { NextRequest, NextResponse } from 'next/server';
import {
  proposeRequest,
  isProposeRateLimited,
  ASSET_CATEGORIES,
  type AssetCategory,
} from '../../../../lib/asset-requests';

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isProposeRateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          'You can only propose one pair per hour. Try upvoting an existing one.',
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const symbol = typeof body.symbol === 'string' ? body.symbol.trim() : '';
  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim() : '';
  const category =
    typeof body.category === 'string' ? body.category.trim() : '';

  if (!symbol || symbol.length < 2 || symbol.length > 16) {
    return NextResponse.json(
      { error: 'Symbol must be 2-16 characters' },
      { status: 400 },
    );
  }
  if (!/^[A-Za-z0-9/_.-]+$/.test(symbol)) {
    return NextResponse.json(
      { error: 'Symbol contains invalid characters' },
      { status: 400 },
    );
  }
  if (!displayName || displayName.length < 2 || displayName.length > 80) {
    return NextResponse.json(
      { error: 'Display name must be 2-80 characters' },
      { status: 400 },
    );
  }
  if (!ASSET_CATEGORIES.includes(category as AssetCategory)) {
    return NextResponse.json(
      {
        error: `Category must be one of: ${ASSET_CATEGORIES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const { request, isNew } = proposeRequest({
    symbol,
    displayName,
    category: category as AssetCategory,
  });

  return NextResponse.json(
    {
      success: true,
      isNew,
      request: {
        id: request.id,
        symbol: request.symbol,
        displayName: request.displayName,
        category: request.category,
        votes: request.votes,
        createdAt: request.createdAt,
        subscriberCount: request.notifySubscribers.length,
      },
    },
    { status: isNew ? 201 : 200 },
  );
}
