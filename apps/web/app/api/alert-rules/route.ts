import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAlertRulesForUser, createAlertRule } from '@/lib/alert-rules-db';
import { readSessionFromRequest } from '@/lib/user-session';

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
  const rule = await createAlertRule(session.userId, parsed.data);
  return NextResponse.json({ rule }, { status: 201 });
}
