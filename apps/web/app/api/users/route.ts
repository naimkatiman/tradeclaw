import { NextRequest, NextResponse } from 'next/server';
import { getUsers, addUser } from '../../../lib/user-wall';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = getUsers();
    return NextResponse.json({ users, count: users.length }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const useCase = typeof body.useCase === 'string' ? body.useCase.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  }
  if (!useCase || useCase.length < 10) {
    return NextResponse.json({ error: 'Use case must be at least 10 characters' }, { status: 400 });
  }

  try {
    const entry = addUser({ name, useCase, country });
    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}
