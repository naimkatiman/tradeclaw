import { NextRequest, NextResponse } from 'next/server';
import { deleteKey, toggleKey } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
<<<<<<< HEAD
  const { id } = await params;
  const ok = deleteKey(id);
  if (!ok) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = toggleKey(id);
  if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  return NextResponse.json({ key: { ...key, key: key.key.slice(0, 12) + '••••' } });
=======
  try {
    const { id } = await params;
    const ok = deleteKey(id);
    if (!ok) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = toggleKey(id);
    if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    return NextResponse.json({ key: { ...key, key: key.key.slice(0, 12) + '••••' } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
>>>>>>> origin/main
}
