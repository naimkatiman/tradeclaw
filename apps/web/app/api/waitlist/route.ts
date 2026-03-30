import { NextRequest, NextResponse } from 'next/server';
import { joinWaitlist, getWaitlistCount, getPosition } from '../../../lib/waitlist';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    const count = getWaitlistCount();

    if (email) {
      const pos = getPosition(email);
      if (!pos) {
        return NextResponse.json({ count, position: null });
      }
      return NextResponse.json({
        count,
        position: pos.position,
        ref: pos.referralCode,
        referralCode: pos.referralCode,
        referralCount: pos.referralCount,
      });
    }

    return NextResponse.json({ count });
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
  const ref = typeof body.ref === 'string' ? body.ref.trim() : undefined;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const { entry, isNew } = joinWaitlist(email, ref);
  const count = getWaitlistCount();
  const pos = getPosition(email);

  return NextResponse.json(
    {
      success: true,
      email: entry.email,
      ref: entry.referralCode,
      referralCode: entry.referralCode,
      referralCount: entry.referralCount,
      position: pos?.position ?? count,
      count,
      isNew,
    },
    { status: isNew ? 201 : 200 },
  );
}
