import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { getDemoUserId } from '../../../../lib/paper-trading';
import { generateBriefing } from '../../../../lib/game-plans';

// ---------------------------------------------------------------------------
// GET /api/cron/game-plan — Vercel Cron handler for the pre-market briefing.
// Runs once daily in the early morning sync window and refreshes the demo
// trade plan so the public /game-plan surface has a fresh briefing.
// Also supports POST for manual trigger / smoke testing.
// ---------------------------------------------------------------------------

async function handler(request: NextRequest): Promise<NextResponse> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const userId = getDemoUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, skipped: true, error: 'PUBLIC_WIDGET_DEMO_USER_ID not configured' },
      { status: 503 },
    );
  }

  try {
    const plan = await generateBriefing(userId);
    return NextResponse.json({
      ok: true,
      generated: true,
      userId,
      plan,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handler(request);
}
