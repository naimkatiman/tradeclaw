import { NextRequest, NextResponse } from 'next/server';
import { addSmsSubscriber, removeSmsSubscriber, getSmsStats } from '@/lib/sms-subscribers';

export const dynamic = 'force-dynamic';

const VALID_PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD',
];

export async function GET() {
  try {
    const stats = await getSmsStats();
    return NextResponse.json(stats, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pairs, minConfidence, action } = body as {
      phone?: string;
      pairs?: string[];
      minConfidence?: number;
      action?: string;
    };

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/\s+/g, '');

    // Basic phone validation: must start with + and have 10-15 digits
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use international format: +1234567890' },
        { status: 400 },
      );
    }

    // Unsubscribe action
    if (action === 'unsubscribe') {
      const removed = await removeSmsSubscriber(normalizedPhone);
      if (!removed) {
        return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, message: 'Unsubscribed successfully' });
    }

    // Subscribe
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: 'Select at least one trading pair' }, { status: 400 });
    }

    const validPairs = pairs.filter((p) => VALID_PAIRS.includes(p.toUpperCase()));
    if (validPairs.length === 0) {
      return NextResponse.json({ error: 'No valid trading pairs selected' }, { status: 400 });
    }

    const confidence = Math.max(50, Math.min(100, minConfidence ?? 70));

    const result = await addSmsSubscriber(normalizedPhone, validPairs, confidence);

    return NextResponse.json({
      ok: result.ok,
      subscriberCount: result.count,
      subscriber: {
        phone: result.subscriber.phone,
        pairs: result.subscriber.pairs,
        minConfidence: result.subscriber.minConfidence,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
