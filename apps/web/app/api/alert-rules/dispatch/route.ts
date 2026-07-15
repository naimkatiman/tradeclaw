import { NextRequest, NextResponse } from 'next/server';
import { getAllEnabledRules, getChannelConfigsForUser, signalMatchesRule } from '@/lib/alert-rules-db';
import { sendToChannel, type ChannelName, type AlertSignal } from '@/lib/alert-channels';
import { recordBroadcastResult } from '@/lib/observability';
import { requireCronAuth } from '@/lib/cron-auth';
import { evaluateCostAdjustedEdge } from '@/lib/cost-adjusted-edge-gate';

export async function POST(req: NextRequest) {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const body = await req.json();
  const { signal } = body as { signal: AlertSignal & { [key: string]: unknown } };

  if (!signal?.symbol) {
    return NextResponse.json({ error: 'signal is required' }, { status: 400 });
  }

  const edge = await evaluateCostAdjustedEdge({ symbols: [signal.symbol] });
  if (!edge.allowed) {
    return NextResponse.json(
      {
        dispatched: 0,
        results: [],
        halted: `cost_adjusted_edge:${edge.reason}`,
        evidence: {
          usableCount: edge.usableCount,
          activeDays: edge.activeDays,
          coverage: edge.coverage,
          perSignalMeanNetR: edge.perSignalMeanNetR,
          equalDayLowerBoundNetR: edge.equalDayLowerBoundNetR,
        },
      },
      { status: 503 },
    );
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
