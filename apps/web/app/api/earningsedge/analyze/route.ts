import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/earningsedge/analyze';
import { getUserByEmail } from '@/lib/earningsedge/db';
import { check } from '@/lib/rate-limit';

const FREE_LIMIT = 3;
const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anon'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // body.tier is intentionally NOT trusted — entitlement is resolved server-side below.
    const { transcript, userId } = body as {
      transcript: string;
      userId?: string;
    };

    if (!transcript || transcript.trim().length < 100) {
      return NextResponse.json(
        { error: 'Transcript too short — paste the full earnings call transcript.' },
        { status: 400 },
      );
    }

    if (transcript.length > 100000) {
      return NextResponse.json(
        { error: 'Transcript too long — maximum 100,000 characters.' },
        { status: 400 },
      );
    }

    // Entitlement resolved server-side: a paid EE tier (verified in ee_users) bypasses
    // the free limit. Non-paid callers get a server-enforced per-IP daily quota — the
    // previous client-supplied `tier` body field and `x-ee-usage-count` header were
    // trivially bypassable, allowing unlimited paid-LLM use.
    const user = userId ? await getUserByEmail(userId) : null;
    const isPaid = !!user && user.tier !== 'free';

    if (!isPaid) {
      const decision = await check(`ee-analyze:${clientIp(request)}`, {
        max: FREE_LIMIT,
        windowMs: FREE_WINDOW_MS,
      });
      if (!decision.allowed) {
        return NextResponse.json(
          { error: 'Free limit reached', code: 'FREE_LIMIT_REACHED', limit: FREE_LIMIT },
          { status: 402 },
        );
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured.' },
        { status: 503 },
      );
    }

    const analysis = await analyzeTranscript(transcript);

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    if (message.includes('JSON')) {
      return NextResponse.json(
        { error: 'Could not parse AI response — please try again.' },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
