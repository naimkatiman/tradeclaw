import { NextRequest, NextResponse } from 'next/server';
import { getAllEnabledRules, getChannelConfigsForUser, signalMatchesRule } from '@/lib/alert-rules-db';
import { sendToChannel, type ChannelName, type AlertSignal } from '@/lib/alert-channels';
import { recordBroadcastResult } from '@/lib/observability';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { signal } = body as { signal: AlertSignal & { [key: string]: unknown } };

  if (!signal?.symbol) {
    return NextResponse.json({ error: 'signal is required' }, { status: 400 });
  }

  const rules = await getAllEnabledRules();
  const matching = rules.filter((r) => signalMatchesRule(signal, r));

  const results: { ruleId: string; channel: string; success: boolean }[] = [];

  for (const rule of matching) {
    const configs = await getChannelConfigsForUser(rule.user_id);
    const configsByChannel = new Map(configs.map((c) => [c.channel, c]));

    for (const channelName of rule.channels) {
      const cfg = configsByChannel.get(channelName as ChannelName);
      if (!cfg || !cfg.enabled) continue;

      // Inline channel senders. Each returns a boolean and never throws —
      // a Telegram outage or 500 from a user's webhook does not poison
      // the whole batch. See lib/alert-channels.ts for the shape of
      // each channel's `config` map.
      const ok = await sendToChannel(channelName as ChannelName, cfg.config, signal);
      results.push({ ruleId: rule.id, channel: channelName, success: ok });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.length - sent;
  recordBroadcastResult({
    source: 'alert_rules_dispatch',
    attempted: results.length,
    sent,
    failed,
    meta: { signal_symbol: signal.symbol, signal_direction: signal.direction },
  });

  return NextResponse.json({ dispatched: results.length, results });
}
