import 'server-only';

import type { AlertSignal } from './alert-channels';

/**
 * Resend-backed email sender for the alert-channel pipeline.
 *
 * No SDK dependency — Resend's REST API is a single POST. Skipping the
 * SDK keeps the apps/web bundle smaller and avoids a transitive dep we
 * would otherwise need to track.
 *
 * Env vars (set on Railway):
 *   RESEND_API_KEY    — required. Format: re_*
 *   RESEND_FROM_EMAIL — required. Must be a domain you have verified in
 *                       Resend, e.g. "TradeClaw <signals@tradeclaw.win>".
 *
 * If either is unset, sendSignalEmail returns false and the alert
 * dispatcher records the row as a failed delivery rather than silently
 * dropping the user's stored email preference.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FETCH_TIMEOUT_MS = 8000;

function getResendKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

function getFromAddress(): string | null {
  return process.env.RESEND_FROM_EMAIL ?? null;
}

function fmtPrice(p: number | string | null | undefined): string {
  if (p == null) return '—';
  const n = typeof p === 'number' ? p : Number(p);
  if (!Number.isFinite(n)) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(5);
}

export function buildSubject(signal: AlertSignal): string {
  return `${signal.direction} ${signal.symbol} — ${signal.confidence}% (${signal.timeframe})`;
}

export function buildPlainText(signal: AlertSignal): string {
  const lines: string[] = [
    `${signal.direction} ${signal.symbol} — ${signal.timeframe}`,
    `Confidence: ${signal.confidence}%`,
    `Entry: $${fmtPrice(signal.entry)}`,
  ];
  if (signal.takeProfit1 != null) lines.push(`TP1: $${fmtPrice(signal.takeProfit1)}`);
  if (signal.takeProfit2 != null) lines.push(`TP2: $${fmtPrice(signal.takeProfit2)}`);
  if (signal.takeProfit3 != null) lines.push(`TP3: $${fmtPrice(signal.takeProfit3)}`);
  if (signal.stopLoss != null) lines.push(`SL: $${fmtPrice(signal.stopLoss)}`);
  lines.push('', 'Not financial advice. DYOR.', 'https://tradeclaw.win');
  return lines.join('\n');
}

export function buildHtml(signal: AlertSignal): string {
  const dirColor = signal.direction === 'BUY' ? '#10b981' : '#ef4444';
  const rows: Array<[string, string]> = [
    ['Direction', `<strong style="color:${dirColor}">${signal.direction}</strong>`],
    ['Symbol', signal.symbol],
    ['Timeframe', signal.timeframe],
    ['Confidence', `${signal.confidence}%`],
    ['Entry', `$${fmtPrice(signal.entry)}`],
  ];
  if (signal.takeProfit1 != null) rows.push(['TP1', `$${fmtPrice(signal.takeProfit1)}`]);
  if (signal.takeProfit2 != null) rows.push(['TP2', `$${fmtPrice(signal.takeProfit2)}`]);
  if (signal.takeProfit3 != null) rows.push(['TP3', `$${fmtPrice(signal.takeProfit3)}`]);
  if (signal.stopLoss != null) rows.push(['SL', `$${fmtPrice(signal.stopLoss)}`]);

  const cells = rows
    .map(([k, v]) =>
      `<tr><td style="padding:6px 12px;color:#94a3b8;font:12px/1.5 system-ui">${k}</td>` +
      `<td style="padding:6px 12px;color:#e2e8f0;font:14px/1.5 system-ui">${v}</td></tr>`,
    )
    .join('');

  return [
    `<!doctype html><html><body style="background:#0a0a0a;margin:0;padding:24px;color:#e2e8f0">`,
    `<table cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#111;border:1px solid #1f2937;border-radius:12px;overflow:hidden">`,
    `<tr><td style="padding:20px 24px;border-bottom:1px solid #1f2937">`,
    `<div style="font:600 14px/1 system-ui;color:#10b981;letter-spacing:0.06em;text-transform:uppercase">TradeClaw signal</div>`,
    `<div style="font:600 22px/1.2 system-ui;color:#fff;margin-top:6px">${signal.direction} ${signal.symbol}</div>`,
    `</td></tr>`,
    `<tr><td style="padding:8px 12px"><table style="width:100%">${cells}</table></td></tr>`,
    `<tr><td style="padding:14px 24px;border-top:1px solid #1f2937;font:12px/1.5 system-ui;color:#64748b">`,
    `Not financial advice. DYOR. <a href="https://tradeclaw.win" style="color:#10b981;text-decoration:none">tradeclaw.win</a>`,
    `</td></tr>`,
    `</table></body></html>`,
  ].join('');
}

export interface EmailSendResult {
  ok: boolean;
  reason?: 'no_api_key' | 'no_from_address' | 'no_to_address' | 'provider_error' | 'network_error';
  providerId?: string;
}

export async function sendSignalEmail(
  to: string,
  signal: AlertSignal,
): Promise<EmailSendResult> {
  if (!to) return { ok: false, reason: 'no_to_address' };

  const apiKey = getResendKey();
  if (!apiKey) return { ok: false, reason: 'no_api_key' };

  const from = getFromAddress();
  if (!from) return { ok: false, reason: 'no_from_address' };

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: buildSubject(signal),
        text: buildPlainText(signal),
        html: buildHtml(signal),
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return { ok: false, reason: 'provider_error' };
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerId: data.id };
  } catch {
    return { ok: false, reason: 'network_error' };
  }
}
