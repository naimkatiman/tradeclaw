import { NextRequest, NextResponse } from 'next/server';
import { deleteKey, listKeysByEmail, toggleKey } from '@/lib/api-keys';
import { getUserById } from '@/lib/db';
import { readSessionFromRequest } from '@/lib/user-session';

export const dynamic = 'force-dynamic';

async function ownsKey(req: NextRequest, id: string): Promise<boolean> {
  const session = readSessionFromRequest(req);
  if (!session?.userId) return false;
  const user = await getUserById(session.userId);
  if (!user) return false;
  return listKeysByEmail(user.email).some((key) => key.id === id);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await ownsKey(req, id))) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }
    const ok = deleteKey(id);
    if (!ok) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!(await ownsKey(req, id))) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }
    const key = toggleKey(id);
    if (!key) return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    return NextResponse.json({ key: { ...key, key: `${key.key.slice(0, 12)}****` } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
