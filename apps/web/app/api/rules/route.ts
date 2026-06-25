import { NextRequest, NextResponse } from 'next/server';
import { readSessionFromRequest } from '../../../lib/user-session';
import { createRule, listRules, toggleRule, deleteRule } from '../../../lib/custom-rules';
import type { RuleAction } from '../../../lib/custom-rules';

const VALID_ACTIONS: RuleAction[] = ['ENTRY_LONG', 'ENTRY_SHORT', 'EXIT_LONG', 'EXIT_SHORT'];

export async function GET(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const rules = await listRules(session.userId);
    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!Array.isArray(body.conditions) || body.conditions.length === 0) {
      return NextResponse.json({ error: 'conditions must be a non-empty array' }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    const rule = await createRule(session.userId, {
      name: body.name,
      description: body.description,
      conditions: body.conditions,
      action: body.action,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    const rule = await toggleRule(body.id, session.userId, body.enabled);
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = readSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const ok = await deleteRule(id, session.userId);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
