import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscript } from '@/lib/earningsedge/analyze';

const FREE_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript, userId, tier } = body as {
      transcript: string;
      userId?: string;
      tier?: string;
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

    // Free tier limit check (enforced client-side too, but validated here)
    const usageHeader = request.headers.get('x-ee-usage-count');
    const usageCount = usageHeader ? parseInt(usageHeader, 10) : 0;

    if (!userId && !tier && usageCount >= FREE_LIMIT) {
      return NextResponse.json(
        {
          error: 'Free limit reached',
          code: 'FREE_LIMIT_REACHED',
          limit: FREE_LIMIT,
        },
        { status: 402 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
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
