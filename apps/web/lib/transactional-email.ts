import 'server-only';

/**
 * Transactional email sender (billing / lifecycle, not signal alerts).
 *
 * Kept separate from `lib/email-sender.ts` because that module is shaped
 * around `AlertSignal` for the signal-alert pipeline. Mixing dunning,
 * welcome, and trial-ending templates into the same file would force
 * unrelated callers to import alert types.
 *
 * Same Resend env vars as `email-sender.ts`:
 *   RESEND_API_KEY    — required
 *   RESEND_FROM_EMAIL — required (verified domain)
 *
 * If either is unset, send returns `{ ok: false, reason: 'no_api_key' | 'no_from_address' }`.
 * Callers must handle the error path; this module never throws on unconfigured envs.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const FETCH_TIMEOUT_MS = 8000;

export interface EmailSendResult {
  ok: boolean;
  reason?: 'no_api_key' | 'no_from_address' | 'no_to_address' | 'provider_error' | 'network_error';
  providerId?: string;
}

export interface PaymentFailedEmailOpts {
  hostedInvoiceUrl: string | null;
  amountDueCents: number;
  currency: string;
  nextAttemptAt: Date | null;
}

export interface TrialEndingEmailOpts {
  trialEndsAt: Date;
  amountCents: number;
  currency: string;
}

function fmtAmount(cents: number, currency: string): string {
  if (!Number.isFinite(cents) || cents < 0) return '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function fmtDate(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildPaymentFailedSubject(): string {
  return 'Action needed: your TradeClaw payment failed';
}

function buildPaymentFailedText(opts: PaymentFailedEmailOpts): string {
  const amount = fmtAmount(opts.amountDueCents, opts.currency);
  const nextAttempt = fmtDate(opts.nextAttemptAt);
  const lines: string[] = [
    'Your last TradeClaw Pro payment failed.',
    '',
    amount ? `Amount due: ${amount}` : '',
    nextAttempt ? `Stripe will retry on ${nextAttempt}.` : '',
    '',
    'To avoid losing access, update your payment method:',
    opts.hostedInvoiceUrl ?? 'https://tradeclaw.win/dashboard/billing',
    '',
    "You'll keep Pro access for 7 days after the failed attempt while we retry. After that, your account drops to Free.",
    '',
    'Questions? Reply to this email or contact support@tradeclaw.win.',
    '',
    'TradeClaw',
    'https://tradeclaw.win',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function buildPaymentFailedHtml(opts: PaymentFailedEmailOpts): string {
  const amount = fmtAmount(opts.amountDueCents, opts.currency);
  const nextAttempt = fmtDate(opts.nextAttemptAt);
  const updateUrl = opts.hostedInvoiceUrl ?? 'https://tradeclaw.win/dashboard/billing';
  return [
    `<!doctype html><html><body style="background:#0a0a0a;margin:0;padding:24px;color:#e2e8f0">`,
    `<table cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#111;border:1px solid #1f2937;border-radius:12px;overflow:hidden">`,
    `<tr><td style="padding:20px 24px;border-bottom:1px solid #1f2937">`,
    `<div style="font:600 14px/1 system-ui;color:#ef4444;letter-spacing:0.06em;text-transform:uppercase">Payment failed</div>`,
    `<div style="font:600 22px/1.2 system-ui;color:#fff;margin-top:6px">Action needed</div>`,
    `</td></tr>`,
    `<tr><td style="padding:20px 24px;font:14px/1.6 system-ui;color:#cbd5e1">`,
    `<p style="margin:0 0 14px">Your last TradeClaw Pro payment failed.${amount ? ` Amount due: <strong style="color:#fff">${amount}</strong>.` : ''}${nextAttempt ? ` Stripe will retry on <strong style="color:#fff">${nextAttempt}</strong>.` : ''}</p>`,
    `<p style="margin:0 0 18px">To avoid losing access, update your payment method:</p>`,
    `<p style="margin:0 0 18px"><a href="${updateUrl}" style="display:inline-block;background:#10b981;color:#0a0a0a;font:600 14px/1 system-ui;padding:12px 20px;border-radius:8px;text-decoration:none">Update payment method</a></p>`,
    `<p style="margin:0;color:#94a3b8;font-size:13px">You'll keep Pro access for 7 days after the failed attempt while we retry. After that, your account drops to Free.</p>`,
    `</td></tr>`,
    `<tr><td style="padding:14px 24px;border-top:1px solid #1f2937;font:12px/1.5 system-ui;color:#64748b">`,
    `Questions? Reply to this email or contact <a href="mailto:support@tradeclaw.win" style="color:#10b981;text-decoration:none">support@tradeclaw.win</a>.`,
    `</td></tr>`,
    `</table></body></html>`,
  ].join('');
}

export async function sendPaymentFailedEmail(
  to: string,
  opts: PaymentFailedEmailOpts,
): Promise<EmailSendResult> {
  if (!to) return { ok: false, reason: 'no_to_address' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_api_key' };

  const from = process.env.RESEND_FROM_EMAIL;
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
        subject: buildPaymentFailedSubject(),
        text: buildPaymentFailedText(opts),
        html: buildPaymentFailedHtml(opts),
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

// ---------------------------------------------------------------------------
// Trial-ending reminder (T-1d)
// ---------------------------------------------------------------------------

function buildTrialEndingSubject(): string {
  return 'Your TradeClaw Pro trial ends tomorrow';
}

function buildTrialEndingText(opts: TrialEndingEmailOpts): string {
  const amount = opts.amountCents > 0 ? fmtAmount(opts.amountCents, opts.currency) : '';
  const endDate = fmtDate(opts.trialEndsAt);
  const lines: string[] = [
    `Your TradeClaw Pro trial ends ${endDate}.`,
    '',
    amount ? `We'll charge ${amount} to your card on file when the trial converts.` : '',
    '',
    'Want to keep Pro? No action needed — the charge runs automatically.',
    '',
    'Want to cancel? Manage your billing here:',
    'https://tradeclaw.win/dashboard/billing',
    '',
    'Questions? Reply to this email or contact support@tradeclaw.win.',
    '',
    'TradeClaw',
    'https://tradeclaw.win',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function buildTrialEndingHtml(opts: TrialEndingEmailOpts): string {
  const amount = opts.amountCents > 0 ? fmtAmount(opts.amountCents, opts.currency) : '';
  const endDate = fmtDate(opts.trialEndsAt);
  return [
    `<!doctype html><html><body style="background:#0a0a0a;margin:0;padding:24px;color:#e2e8f0">`,
    `<table cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#111;border:1px solid #1f2937;border-radius:12px;overflow:hidden">`,
    `<tr><td style="padding:20px 24px;border-bottom:1px solid #1f2937">`,
    `<div style="font:600 14px/1 system-ui;color:#f59e0b;letter-spacing:0.06em;text-transform:uppercase">Trial ending</div>`,
    `<div style="font:600 22px/1.2 system-ui;color:#fff;margin-top:6px">Trial ends ${endDate}</div>`,
    `</td></tr>`,
    `<tr><td style="padding:20px 24px;font:14px/1.6 system-ui;color:#cbd5e1">`,
    amount
      ? `<p style="margin:0 0 14px">We'll charge <strong style="color:#fff">${amount}</strong> to your card on file when the trial converts.</p>`
      : `<p style="margin:0 0 14px">Your trial converts to paid when it ends.</p>`,
    `<p style="margin:0 0 18px">Want to keep Pro? No action needed — the charge runs automatically.</p>`,
    `<p style="margin:0 0 18px">Want to cancel? Manage your billing here:</p>`,
    `<p style="margin:0 0 18px"><a href="https://tradeclaw.win/dashboard/billing" style="display:inline-block;background:#10b981;color:#0a0a0a;font:600 14px/1 system-ui;padding:12px 20px;border-radius:8px;text-decoration:none">Manage billing</a></p>`,
    `</td></tr>`,
    `<tr><td style="padding:14px 24px;border-top:1px solid #1f2937;font:12px/1.5 system-ui;color:#64748b">`,
    `Questions? Reply to this email or contact <a href="mailto:support@tradeclaw.win" style="color:#10b981;text-decoration:none">support@tradeclaw.win</a>.`,
    `</td></tr>`,
    `</table></body></html>`,
  ].join('');
}

export async function sendTrialEndingEmail(
  to: string,
  opts: TrialEndingEmailOpts,
): Promise<EmailSendResult> {
  if (!to) return { ok: false, reason: 'no_to_address' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'no_api_key' };

  const from = process.env.RESEND_FROM_EMAIL;
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
        subject: buildTrialEndingSubject(),
        text: buildTrialEndingText(opts),
        html: buildTrialEndingHtml(opts),
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

export const __test__ = {
  buildPaymentFailedSubject,
  buildPaymentFailedText,
  buildPaymentFailedHtml,
  buildTrialEndingSubject,
  buildTrialEndingText,
  buildTrialEndingHtml,
  fmtAmount,
  fmtDate,
};
