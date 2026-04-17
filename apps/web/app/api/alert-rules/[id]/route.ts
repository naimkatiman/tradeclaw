import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateAlertRule, deleteAlertRule } from '@/lib/alert-rules-db';
import { readSessionFromRequest } from '@/lib/user-session';

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().nullable().optional(),
  timeframe: z.string().nullable().optional(),
  direction: z.enum(['BUY', 'SELL']).nullable().optional(),
  min_confidence: z.number().int().min(0).max(100).optional(),
  channels: z.array(z.enum(['telegram', 'discord', 'email', 'webhook'])).min(1).optional(),
  enabled: z.boolean().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const rule = await updateAlertRule(id, session.userId, parsed.data);
  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ rule });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  await deleteAlertRule(id, session.userId);
  return new NextResponse(null, { status: 204 });
}
