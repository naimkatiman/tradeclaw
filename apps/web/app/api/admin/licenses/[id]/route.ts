import { NextRequest, NextResponse } from 'next/server';
import {
  getLicenseById,
  addGrants,
  updateExpiry,
  updateIssuedTo,
} from '@/lib/licenses';

const ALLOWED_STRATEGIES = new Set([
  'regime-aware',
  'hmm-top3',
  'vwap-ema-bb',
  'full-risk',
]);

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const license = await getLicenseById(id);
  if (!license) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ license });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const existing = await getLicenseById(id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as {
    addStrategies?: unknown;
    expiresAt?: string | null;
    issuedTo?: string | null;
  };

  if (Array.isArray(body.addStrategies)) {
    const toAdd = body.addStrategies.filter(
      (s): s is string => typeof s === 'string' && ALLOWED_STRATEGIES.has(s),
    );
    if (toAdd.length > 0) await addGrants(id, toAdd);
  }

  if (body.expiresAt !== undefined) {
    const dt = body.expiresAt === null ? null : new Date(body.expiresAt);
    if (dt && Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: 'invalid expiresAt' }, { status: 400 });
    }
    await updateExpiry(id, dt);
  }

  if (body.issuedTo !== undefined) {
    await updateIssuedTo(id, body.issuedTo);
  }

  const updated = await getLicenseById(id);
  return NextResponse.json({ license: updated });
}
