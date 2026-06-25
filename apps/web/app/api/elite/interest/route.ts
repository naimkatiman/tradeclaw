import { NextRequest, NextResponse } from 'next/server';
import {
  hashIpForInterest,
  upsertEliteInterest,
  validateEliteInterest,
  type EliteInterestInput,
  type WtpChoice,
} from '../../../../lib/elite-interest';
import { check } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

interface ParsedBody {
  email: string;
  wantsLiveTrade: boolean;
  wantsCopyTrade: boolean;
  wtpChoice: WtpChoice | null;
  source: string | null;
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return null;
}

function parseBody(raw: unknown): { ok: true; body: ParsedBody } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Body must be a JSON object' };
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.email !== 'string') {
    return { ok: false, error: 'email is required' };
  }
  const wantsLiveTrade = Boolean(r.wantsLiveTrade);
  const wantsCopyTrade = Boolean(r.wantsCopyTrade);
  const wtpChoiceRaw = r.wtpChoice;
  const wtpChoice: WtpChoice | null =
    wtpChoiceRaw === null || wtpChoiceRaw === undefined
      ? null
      : (String(wtpChoiceRaw) as WtpChoice);
  const source = typeof r.source === 'string' ? r.source.slice(0, 64) : null;
  return {
    ok: true,
    body: { email: r.email, wantsLiveTrade, wantsCopyTrade, wtpChoice, source },
  };
}

export async function POST(req: NextRequest): Promise<Response> {
  const ip = getClientIp(req);
  const rateKey = `elite-interest:${ip ?? 'anon'}`;
  const decision = await check(rateKey, { max: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW_MS });
  if (!decision.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: 60 },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input: EliteInterestInput = {
    email: parsed.body.email,
    wantsLiveTrade: parsed.body.wantsLiveTrade,
    wantsCopyTrade: parsed.body.wantsCopyTrade,
    wtpChoice: parsed.body.wtpChoice,
    ipHash: await hashIpForInterest(ip),
    source: parsed.body.source ?? 'pricing',
  };

  const validation = validateEliteInterest(input);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const record = await upsertEliteInterest(input);
    return NextResponse.json({
      ok: true,
      isNew: record.isNew,
      message: record.isNew
        ? "You're on the Elite list. We'll email when we open the doors."
        : 'Updated your preferences. Thanks for the input.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Persistence failed';
    console.error('[api/elite/interest] upsert failed:', message);
    return NextResponse.json({ error: 'Could not save your interest. Try again shortly.' }, { status: 500 });
  }
}
