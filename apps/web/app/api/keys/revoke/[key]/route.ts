import { NextRequest, NextResponse } from 'next/server';
import { getKeyByString, revokeKey } from '@/lib/api-keys';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: keyStr } = await params;

    const keyMeta = getKeyByString(keyStr);
    if (!keyMeta) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    if (keyMeta.status === 'revoked') {
      return NextResponse.json({ error: 'API key is already revoked' }, { status: 400 });
    }

    const revoked = revokeKey(keyMeta.id);
    if (!revoked) {
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
    }

    return NextResponse.json({ revoked: true, keyName: keyMeta.name });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
