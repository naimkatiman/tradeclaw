import { NextResponse } from 'next/server';
import {
  readSlackIntegrations,
  addSlackIntegration,
  removeSlackIntegration,
  updateSlackIntegration,
  sendSlackSignal,
  TEST_SLACK_PAYLOAD,
} from '@/lib/slack-integration';

export const dynamic = 'force-dynamic';

interface SlackRequest {
  action: 'list' | 'add' | 'remove' | 'update' | 'test' | 'send';
  id?: string;
  webhookUrl?: string;
  name?: string;
  channel?: string;
  pairs?: string[] | 'all';
  minConfidence?: number;
  direction?: 'ALL' | 'BUY' | 'SELL';
  enabled?: boolean;
  signal?: {
    id: string;
    symbol: string;
    timeframe: string;
    direction: 'BUY' | 'SELL';
    confidence: number;
    entry: number;
    stopLoss: number;
    takeProfit: number[];
    indicators: { rsi: number; macd: string; ema: string };
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SlackRequest;
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    // LIST
    if (action === 'list') {
      const integrations = readSlackIntegrations().map((s) => ({
        ...s,
        webhookUrl: maskUrl(s.webhookUrl),
        deliveryLog: [],
      }));
      return NextResponse.json({ success: true, data: integrations });
    }

    // ADD
    if (action === 'add') {
      if (!body.webhookUrl) {
        return NextResponse.json({ success: false, error: 'Missing webhookUrl' }, { status: 400 });
      }
      if (!body.webhookUrl.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook URL — must start with https://hooks.slack.com/' },
          { status: 400 }
        );
      }
      const si = addSlackIntegration({
        webhookUrl: body.webhookUrl,
        name: body.name,
        channel: body.channel,
        pairs: body.pairs,
        minConfidence: body.minConfidence,
        direction: body.direction,
      });
      return NextResponse.json({ success: true, data: si });
    }

    // REMOVE
    if (action === 'remove') {
      if (!body.id) {
        return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      }
      const removed = removeSlackIntegration(body.id);
      if (!removed) {
        return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { id: body.id } });
    }

    // UPDATE
    if (action === 'update') {
      if (!body.id) {
        return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      }
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.channel !== undefined) patch.channel = body.channel;
      if (body.enabled !== undefined) patch.enabled = body.enabled;
      if (body.pairs !== undefined) patch.pairs = body.pairs;
      if (body.minConfidence !== undefined) patch.minConfidence = body.minConfidence;
      if (body.direction !== undefined) patch.direction = body.direction;
      const updated = updateSlackIntegration(body.id, patch);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { ...updated, webhookUrl: maskUrl(updated.webhookUrl) } });
    }

    // TEST
    if (action === 'test') {
      if (!body.id) {
        return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
      }
      const integrations = readSlackIntegrations();
      const si = integrations.find((s) => s.id === body.id);
      if (!si) {
        return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
      }
      const result = await sendSlackSignal(si, { ...TEST_SLACK_PAYLOAD, timestamp: new Date().toISOString() });
      return NextResponse.json({ success: result.success, data: result });
    }

    // SEND
    if (action === 'send') {
      if (!body.id || !body.signal) {
        return NextResponse.json({ success: false, error: 'Missing id or signal' }, { status: 400 });
      }
      const integrations = readSlackIntegrations();
      const si = integrations.find((s) => s.id === body.id);
      if (!si) {
        return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 });
      }
      const payload = {
        event: 'signal.new' as const,
        timestamp: new Date().toISOString(),
        signal: body.signal,
      };
      const result = await sendSlackSignal(si, payload);
      return NextResponse.json({ success: result.success, data: result });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function maskUrl(url: string): string {
  if (url.length <= 30) return url;
  return url.slice(0, 26) + '...' + url.slice(-4);
}
