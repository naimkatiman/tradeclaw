import { NextRequest, NextResponse } from 'next/server';
import { resolveLicense, FREE_STRATEGY } from '@/lib/licenses';
import { query } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChannelRow {
  strategy_id: string;
  invite_url: string;
  label: string | null;
}

interface ChannelResponse {
  strategyId: string;
  label: string | null;
  inviteUrl: string;
}

export async function GET(req: NextRequest) {
  const ctx = await resolveLicense(req);
  const unlocked = [...ctx.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (unlocked.length === 0) {
    return NextResponse.json({ channels: [] });
  }

  const rows = await query<ChannelRow>(
    `SELECT strategy_id, invite_url, label
     FROM telegram_strategy_channels
     WHERE strategy_id = ANY($1)
     ORDER BY strategy_id`,
    [unlocked],
  );

  const channels: ChannelResponse[] = rows.map((c) => ({
    strategyId: c.strategy_id,
    label: c.label,
    inviteUrl: c.invite_url,
  }));

  return NextResponse.json({ channels });
}
