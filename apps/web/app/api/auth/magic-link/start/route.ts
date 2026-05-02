import { NextRequest, NextResponse } from 'next/server';
import { issueMagicLink } from '../../../../../lib/magic-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;
const recentByEmail = new Map<string, number>();

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalized = (email ?? '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const last = recentByEmail.get(normalized) ?? 0;
  if (Date.now() - last < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
  recentByEmail.set(normalized, Date.now());

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    // Misconfigured in dev — issue the token anyway, log it server-side, and tell the client OK
    // so the UX path is exercised. In production both env vars MUST be set.
    await issueMagicLink(normalized);
    return NextResponse.json({ ok: true });
  }

  const { raw } = await issueMagicLink(normalized);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const link = `${base}/api/auth/magic-link/verify?token=${encodeURIComponent(raw)}`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [normalized],
      subject: 'Your TradeClaw sign-in link',
      text: `Click to sign in to TradeClaw. This link expires in 15 minutes and works once.\n\n${link}\n\nIf you didn't request this, ignore this email.`,
      html: `<p>Click to sign in to TradeClaw. This link expires in 15 minutes and works once.</p><p><a href="${link}">${link}</a></p><p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
