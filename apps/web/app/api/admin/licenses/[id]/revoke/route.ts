import { NextRequest, NextResponse } from 'next/server';
import { getLicenseById, revokeLicense } from '@/lib/licenses';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const existing = await getLicenseById(id);
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await revokeLicense(id);
  const updated = await getLicenseById(id);
  return NextResponse.json({ license: updated });
}
