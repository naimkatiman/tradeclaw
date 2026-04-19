import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAlertRulesForUser, createAlertRule } from '@/lib/alert-rules-db';
import { readSessionFromRequest } from '@/lib/user-session';
import { getTierFromRequest, upgradeRequiredBody, meetsMinimumTier } from '@/lib/tier';

const FREE_ACTIVE_RULE_CAP = 3;

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().nullable().default(null),
  timeframe: z.string().nullable().default(null),
  direction: z.enum(['BUY', 'SELL']).nullable().default(null),
  min_confidence: z.number().int().min(0).max(100).default(70),
  channels: z.array(z.enum(['telegram', 'discord', 'email', 'webhook'])).min(1),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rules = await getAlertRulesForUser(session.userId);
  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Tier cap: Free accounts are limited to 3 active rules. Disabled rules
  // don't consume quota — creating a draft/disabled rule is always fine.
  // Pro+ bypass entirely.
  const tier = await getTierFromRequest(req);
  if (!meetsMinimumTier(tier, 'pro') && parsed.data.enabled) {
    const existing = await getAlertRulesForUser(session.userId);
    const activeCount = existing.filter((r) => r.enabled).length;
    if (activeCount >= FREE_ACTIVE_RULE_CAP) {
      return NextResponse.json(
        upgradeRequiredBody({
          reason: `Free accounts can have ${FREE_ACTIVE_RULE_CAP} active alert rules. Upgrade to Pro for unlimited.`,
          source: 'alert-rules',
          limit: {
            kind: 'count',
            used: activeCount,
            max: FREE_ACTIVE_RULE_CAP,
          },
        }),
        { status: 402 },
      );
    }
  }

  const rule = await createAlertRule(session.userId, parsed.data);
  return NextResponse.json({ rule }, { status: 201 });
}
