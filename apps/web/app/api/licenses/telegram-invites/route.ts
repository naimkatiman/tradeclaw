import { NextRequest, NextResponse } from 'next/server';
import { resolveLicense, FREE_STRATEGY } from '@/lib/licenses';
import { query } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChannelRow {
  strategy_id: string;
  chat_id: string;
  label: string | null;
}

interface InviteResponse {
  strategyId: string;
  label: string | null;
  chatId: string;
  inviteUrl: string | null;
}

/**
 * Returns one Telegram channel entry per unlocked premium strategy the
 * caller's license grants. inviteUrl is null until a bot worker populates
 * telegram_invites with a strategy-scoped row; the client renders a
 * "pending" state in that case.
 */
export async function GET(req: NextRequest) {
  const ctx = await resolveLicense(req);
  const unlocked = [...ctx.unlockedStrategies].filter((s) => s !== FREE_STRATEGY);
  if (unlocked.length === 0) {
    return NextResponse.json({ channels: [] });
  }

  const channels = await query<ChannelRow>(
    `SELECT strategy_id, chat_id, label
     FROM telegram_strategy_channels
     WHERE strategy_id = ANY($1)
     ORDER BY strategy_id`,
    [unlocked],
  );

  const invites = await query<{ strategy_id: string; invite_link: string }>(
    `SELECT strategy_id, invite_link
     FROM telegram_invites
     WHERE strategy_id = ANY($1) AND is_active = TRUE
     ORDER BY created_at DESC`,
    [unlocked],
  );
  const latestByStrategy = new Map<string, string>();
  for (const row of invites) {
    if (!latestByStrategy.has(row.strategy_id)) {
      latestByStrategy.set(row.strategy_id, row.invite_link);
    }
  }

  const response: InviteResponse[] = channels.map((c) => ({
    strategyId: c.strategy_id,
    label: c.label,
    chatId: c.chat_id,
    inviteUrl: latestByStrategy.get(c.strategy_id) ?? null,
  }));

  return NextResponse.json({ channels: response });
}
