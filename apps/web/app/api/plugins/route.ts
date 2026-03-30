import { NextRequest, NextResponse } from 'next/server';
import {
  listPlugins,
  createPlugin,
  validatePluginCode,
  type PluginIndicator,
} from '../../../lib/plugin-system';

export async function GET() {
  try {
    const plugins = listPlugins();
    return NextResponse.json({ plugins, total: plugins.length });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, version, author, category, code, params, enabled } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'name and code are required' }, { status: 400 });
    }

    // Validate code
    const validation = validatePluginCode(code);
    if (!validation.valid) {
      return NextResponse.json({ error: `Invalid plugin code: ${validation.error}` }, { status: 400 });
    }

    const plugin = createPlugin({
      name,
      description: description || '',
      version: version || '1.0.0',
      author: author || 'Anonymous',
      category: category || 'custom',
      code,
      params: params || [],
      enabled: enabled !== false,
    } as Omit<PluginIndicator, 'id' | 'createdAt' | 'updatedAt'>);

    return NextResponse.json({ plugin }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
