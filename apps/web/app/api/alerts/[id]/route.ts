import { NextRequest, NextResponse } from 'next/server';
import { getAlert, updateAlert, deleteAlert } from '../../../../lib/price-alerts';
import { readSessionFromRequest } from '../../../../lib/user-session';

type Params = { id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const alert = await getAlert({ userId: session.userId, id });
    if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ alert });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const allowed = ['targetPrice', 'direction', 'status', 'note', 'percentMove', 'timeWindow'] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const alert = await updateAlert(
      { userId: session.userId, id },
      updates as Parameters<typeof updateAlert>[1],
    );
    if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ alert });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = readSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const ok = await deleteAlert({ userId: session.userId, id });
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
