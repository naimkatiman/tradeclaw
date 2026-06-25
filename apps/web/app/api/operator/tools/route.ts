import { NextRequest, NextResponse } from 'next/server';

import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import { isAdminEmail } from '../../../../lib/admin-emails';
import { listTools, toggleTool, updateToolConfig } from '../../../../lib/tools-registry';

async function authorize(req: NextRequest): Promise<boolean> {
  const session = readSessionFromRequest(req);
  if (!session?.userId) return false;
  const user = await getUserById(session.userId);
  return !!(user?.email && isAdminEmail(user.email));
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const tools = await listTools();
  return NextResponse.json({ tools });
}

export async function PATCH(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { id, enabled, config } = body as {
    id?: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  };

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  let tool = null;
  if (typeof enabled === 'boolean') {
    tool = await toggleTool(id, enabled);
  }
  if (config && typeof config === 'object') {
    tool = await updateToolConfig(id, config);
  }

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  return NextResponse.json({ tool });
}
