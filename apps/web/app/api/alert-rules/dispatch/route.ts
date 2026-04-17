import { NextRequest, NextResponse } from 'next/server';
import { getAllEnabledRules, getChannelConfigsForUser, signalMatchesRule } from '@/lib/alert-rules-db';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { signal } = body as { signal: {
    symbol: string; timeframe: string; direction: 'BUY' | 'SELL';
    confidence: number; [key: string]: unknown;
  }};

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
      const cfg = configsByChannel.get(channelName);
      if (!cfg || !cfg.enabled) continue;

      try {
        const { createChannel } = await import('@tradeclaw/agent/channels/base');
        const channelConfig = {
          type: channelName as 'telegram' | 'discord' | 'webhook',
          enabled: true,
          telegramBotToken: cfg.config.botToken,
          telegramChatId: cfg.config.chatId,
          discordWebhookUrl: cfg.config.webhookUrl,
          webhookUrl: cfg.config.url,
        };

        const channel = await createChannel(channelConfig);
        if (!channel) continue;

        const validationError = channel.validate();
        if (validationError) {
          results.push({ ruleId: rule.id, channel: channelName, success: false });
          continue;
        }

        const ok = await channel.sendSignal(signal as any);
        results.push({ ruleId: rule.id, channel: channelName, success: ok });
      } catch {
        results.push({ ruleId: rule.id, channel: channelName, success: false });
      }
    }
  }

  return NextResponse.json({ dispatched: results.length, results });
}
