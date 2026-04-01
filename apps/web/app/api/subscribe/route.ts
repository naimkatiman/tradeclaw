import { NextRequest, NextResponse } from 'next/server';
import { addSubscriber, removeSubscriberByToken, getStats } from '../../../lib/email-subscribers';

const VALID_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD',
];

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const rawPairs = Array.isArray(body.pairs) ? body.pairs : [];
  const pairs = rawPairs.filter((p): p is string => typeof p === 'string' && VALID_PAIRS.includes(p));
  if (pairs.length === 0) {
    return NextResponse.json({ error: 'At least one valid pair is required' }, { status: 400 });
  }

  const minConfidence = typeof body.minConfidence === 'number'
    ? Math.max(50, Math.min(90, Math.round(body.minConfidence)))
    : 70;

  try {
    const result = await addSubscriber(email, pairs, minConfidence);
    return NextResponse.json({ ok: true, count: result.count }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token')?.trim() ?? '';

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const removed = await removeSubscriberByToken(token);
    if (!removed) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
