import { NextRequest, NextResponse } from 'next/server';
import { getAlert, updateAlert, deleteAlert } from '../../../../lib/price-alerts';

type Params = { id: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const alert = getAlert(id);
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
  try {
    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Whitelist updatable fields
    const allowed = ['targetPrice', 'direction', 'status', 'note', 'percentMove', 'timeWindow'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const alert = updateAlert(id, updates as Parameters<typeof updateAlert>[1]);
    if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ alert });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const ok = deleteAlert(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
