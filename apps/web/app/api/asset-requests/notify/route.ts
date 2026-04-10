import { NextRequest, NextResponse } from 'next/server';
import {
  subscribeToNotify,
  isNotifyRateLimited,
  isValidEmail,
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
  if (isNotifyRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Valid email is required' },
      { status: 400 },
    );
  }

  const result = subscribeToNotify(id, email);
  if (!result) {
    return NextResponse.json({ error: 'Unknown request id' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    id: result.request.id,
    votes: result.request.votes,
    subscriberCount: result.request.notifySubscribers.length,
    alreadySubscribed: result.alreadySubscribed,
  });
}
