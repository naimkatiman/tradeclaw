import { NextRequest, NextResponse } from 'next/server';
import {
  getPlugin,
  updatePlugin,
  deletePlugin,
  togglePlugin,
  validatePluginCode,
} from '../../../../lib/plugin-system';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plugin = getPlugin(id);
  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  return NextResponse.json({ plugin });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();

    // If toggling enabled state
    if (body.toggle === true) {
      const plugin = togglePlugin(id);
      if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
      return NextResponse.json({ plugin });
    }

    // If updating code, validate it
    if (body.code) {
      const validation = validatePluginCode(body.code);
      if (!validation.valid) {
        return NextResponse.json({ error: `Invalid code: ${validation.error}` }, { status: 400 });
      }
    }

    const plugin = updatePlugin(id, body);
    if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    return NextResponse.json({ plugin });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = deletePlugin(id);
  if (!ok) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
