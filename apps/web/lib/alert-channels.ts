import 'server-only';

/**
 * Per-user "preferred platform" senders.
 *
 * Replaces the previous /api/alert-rules/dispatch flow which dynamically
 * imported `@naimkatiman/tradeclaw-agent` — a package not declared in
 * apps/web/package.json. The import always failed at runtime; the route's
 * try/catch swallowed it; users who configured Telegram DM / Discord /
 * webhook delivery never received anything.
 *
 * Each sender is a pure function over a `ChannelConfig.config` map and a
 * normalized signal. Returns true on a successful HTTP response (2xx and
 * provider-ok if the provider exposes one). Never throws.
 *
 * Supported channels (matches alert_channel_configs.channel enum):
 *   - 'telegram' — personal DM via Telegram bot. config: { botToken, chatId }
 *                  Falls back to TELEGRAM_BOT_TOKEN env var if botToken is
 *                  empty so users only need to provide their chat_id.
 *   - 'discord'  — Discord channel webhook. config: { webhookUrl }
 *   - 'webhook'  — Generic JSON POST. config: { url, secret? }
 *   - 'email'    — Stub: returns false until an email provider is wired
 *                  (no provider deps in apps/web today).
 */

const TELEGRAM_API = 'https://api.telegram.org';
const FETCH_TIMEOUT_MS = 8000;

export interface AlertSignal {
  id?: string;
  symbol: string;
  timeframe: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry?: number | string;
  stopLoss?: number | string | null;
  takeProfit1?: number | string | null;
  takeProfit2?: number | string | null;
  takeProfit3?: number | string | null;
}

function md(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function fmtPrice(p: number | string | null | undefined): string {
  if (p == null) return '—';
  const n = typeof p === 'number' ? p : Number(p);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export function formatTelegramText(signal: AlertSignal): string {
  const dirEmoji = signal.direction === 'BUY' ? '\u{1F4C8}' : '\u{1F4C9}';
  const lines: string[] = [
    `${dirEmoji} *${md(signal.direction)} ${md(signal.symbol)} \\- ${md(signal.timeframe)}*`,
    `Confidence: ${md(String(signal.confidence))}%`,
    `Entry: \\$${md(fmtPrice(signal.entry))}`,
  ];
  if (signal.takeProfit1 != null) lines.push(`TP1: \\$${md(fmtPrice(signal.takeProfit1))}`);
  if (signal.takeProfit2 != null) lines.push(`TP2: \\$${md(fmtPrice(signal.takeProfit2))}`);
  if (signal.takeProfit3 != null) lines.push(`TP3: \\$${md(fmtPrice(signal.takeProfit3))}`);
  if (signal.stopLoss != null) lines.push(`SL: \\$${md(fmtPrice(signal.stopLoss))}`);
  return lines.join('\n');
}

export function formatDiscordEmbed(signal: AlertSignal): {
  embeds: Array<Record<string, unknown>>;
} {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Direction', value: signal.direction, inline: true },
    { name: 'Confidence', value: `${signal.confidence}%`, inline: true },
    { name: 'Timeframe', value: signal.timeframe, inline: true },
    { name: 'Entry', value: fmtPrice(signal.entry), inline: true },
  ];
  if (signal.takeProfit1 != null) fields.push({ name: 'TP1', value: fmtPrice(signal.takeProfit1), inline: true });
  if (signal.takeProfit2 != null) fields.push({ name: 'TP2', value: fmtPrice(signal.takeProfit2), inline: true });
  if (signal.takeProfit3 != null) fields.push({ name: 'TP3', value: fmtPrice(signal.takeProfit3), inline: true });
  if (signal.stopLoss != null) fields.push({ name: 'SL', value: fmtPrice(signal.stopLoss), inline: true });

  return {
    embeds: [
      {
        title: `${signal.direction} ${signal.symbol}`,
        color: signal.direction === 'BUY' ? 0x10b981 : 0xef4444,
        fields,
        footer: { text: 'TradeClaw — Not financial advice. DYOR.' },
      },
    ],
  };
}

export async function sendTelegramDm(
  config: Record<string, string>,
  signal: AlertSignal,
): Promise<boolean> {
  const chatId = config.chatId;
  if (!chatId) return false;
  const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formatTelegramText(signal),
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = (await res.json()) as { ok: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function sendDiscordWebhook(
  config: Record<string, string>,
  signal: AlertSignal,
): Promise<boolean> {
  const url = config.webhookUrl;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatDiscordEmbed(signal)),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendGenericWebhook(
  config: Record<string, string>,
  signal: AlertSignal,
): Promise<boolean> {
  const url = config.url;
  if (!url) return false;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-TradeClaw-Source': 'alert-rules',
    };
    if (config.secret) headers['X-TradeClaw-Secret'] = config.secret;
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ signal, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(
  _config: Record<string, string>,
  _signal: AlertSignal,
): Promise<boolean> {
  // Email delivery requires an external provider (Resend, SendGrid, SES, …).
  // None is wired into apps/web today. Return false so callers see the row
  // as failed rather than silently dropping the user's preference.
  return false;
}

export type ChannelName = 'telegram' | 'discord' | 'email' | 'webhook';

/**
 * Single-entry dispatcher used by /api/alert-rules/dispatch. Returns true
 * iff the channel sender confirmed delivery. Unknown channel names return
 * false rather than throwing.
 */
export async function sendToChannel(
  channel: ChannelName,
  config: Record<string, string>,
  signal: AlertSignal,
): Promise<boolean> {
  switch (channel) {
    case 'telegram': return sendTelegramDm(config, signal);
    case 'discord':  return sendDiscordWebhook(config, signal);
    case 'webhook':  return sendGenericWebhook(config, signal);
    case 'email':    return sendEmail(config, signal);
    default:         return false;
  }
}
