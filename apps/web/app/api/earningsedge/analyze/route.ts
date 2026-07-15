import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/earningsedge/analyze';
import { check } from '@/lib/rate-limit';

const FREE_LIMIT = 3;
const FREE_WINDOW_MS = 24 * 60 * 60 * 1000;

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anon';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { transcript?: string };
    const transcript = body.transcript;

    if (!transcript || transcript.trim().length < 100) {
      return NextResponse.json({ error: 'Transcript too short; paste the full earnings call transcript.' }, { status: 400 });
    }
    if (transcript.length > 100_000) {
      return NextResponse.json({ error: 'Transcript too long; maximum 100,000 characters.' }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured.' }, { status: 503 });
    }

    const decision = await check(`ee-analyze:${clientIp(request)}`, {
      max: FREE_LIMIT,
      windowMs: FREE_WINDOW_MS,
    });
    if (!decision.allowed) {
      return NextResponse.json({
        error: 'Free limit reached',
        code: 'FREE_LIMIT_REACHED',
        quota: { limit: FREE_LIMIT, windowHours: 24, remaining: 0 },
      }, { status: 429 });
    }

    const analysis = await analyzeTranscript(transcript);
    return NextResponse.json({
      analysis,
      modelProvider: 'OpenRouter',
      quota: { limit: FREE_LIMIT, windowHours: 24, remaining: decision.remaining },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    if (message.includes('JSON')) {
      return NextResponse.json({ error: 'Could not parse AI response; please try again.' }, { status: 502 });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
