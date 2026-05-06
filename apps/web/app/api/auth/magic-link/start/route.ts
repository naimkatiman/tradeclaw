import { NextRequest, NextResponse } from 'next/server';
import { countRecentMagicLinkEmails, issueMagicLink } from '../../../../../lib/magic-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_SECONDS = 60;

export async function POST(req: NextRequest) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalized = (email ?? '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // DB-backed rate limit: in-process Map was useless on serverless cold
  // starts and let an attacker enumerate emails / pollute the token table.
  // Check BEFORE issuing — never write to the DB on a rate-limited request.
  // Silent 200 so we don't double as an account-existence oracle.
  const recent = await countRecentMagicLinkEmails(normalized, RATE_LIMIT_WINDOW_SECONDS);
  if (recent > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    // No email transport configured → still issue a token (so /verify works
    // for an operator pulling it out of the DB) but DO NOT log it. Tokens
    // in dev logs end up in shared CI buffers and ship to log aggregators.
    await issueMagicLink(normalized);
    return NextResponse.json({ ok: true });
  }

  const { raw } = await issueMagicLink(normalized);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://tradeclaw.win';
  const link = `${base}/api/auth/magic-link/verify?token=${encodeURIComponent(raw)}`;

  const sendRes = await fetch('https://api.resend.com/emails', {
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

  if (!sendRes || !sendRes.ok) {
    return NextResponse.json({ error: 'email_send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
