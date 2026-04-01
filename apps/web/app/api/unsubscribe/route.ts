import { NextRequest, NextResponse } from 'next/server';
import { removeSubscriberByToken } from '../../../lib/email-subscribers';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  try {
    const removed = await removeSubscriberByToken(token);
    if (!removed) {
      return NextResponse.json({ error: 'Subscriber not found or already removed' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, message: 'Unsubscribed successfully' });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}
