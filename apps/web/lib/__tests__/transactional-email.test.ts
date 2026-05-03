import {
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
  __test__,
  type PaymentFailedEmailOpts,
  type TrialEndingEmailOpts,
} from '../transactional-email';

const ORIG = { ...process.env };

function makeOpts(overrides: Partial<PaymentFailedEmailOpts> = {}): PaymentFailedEmailOpts {
  return {
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/acct_x/test_inv',
    amountDueCents: 2900,
    currency: 'usd',
    nextAttemptAt: new Date('2026-05-10T12:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  process.env = { ...ORIG };
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  global.fetch = jest.fn();
});

afterAll(() => {
  process.env = ORIG;
});

describe('builders', () => {
  it('subject is action-oriented', () => {
    expect(__test__.buildPaymentFailedSubject()).toMatch(/payment failed/i);
    expect(__test__.buildPaymentFailedSubject()).toMatch(/action/i);
  });

  it('plain text includes amount, retry date, and Stripe hosted URL', () => {
    const text = __test__.buildPaymentFailedText(makeOpts());
    expect(text).toContain('$29.00');
    expect(text).toContain('May 10');
    expect(text).toContain('https://invoice.stripe.com/i/acct_x/test_inv');
    expect(text).toContain('7 days');
  });

  it('plain text falls back to /dashboard/billing when hosted URL is missing', () => {
    const text = __test__.buildPaymentFailedText(makeOpts({ hostedInvoiceUrl: null }));
    expect(text).toContain('https://tradeclaw.win/dashboard/billing');
    expect(text).not.toContain('invoice.stripe.com');
  });

  it('plain text gracefully omits the retry-date line when next attempt is unknown', () => {
    const text = __test__.buildPaymentFailedText(makeOpts({ nextAttemptAt: null }));
    expect(text).not.toMatch(/retry on/i);
  });

  it('HTML uses red accent for the failed-payment header', () => {
    const html = __test__.buildPaymentFailedHtml(makeOpts());
    expect(html).toContain('#ef4444');
    expect(html).toContain('Update payment method');
  });

  it('formats EUR with the right currency symbol', () => {
    expect(__test__.fmtAmount(1990, 'eur')).toMatch(/€19\.90|EUR.*19\.90/);
  });
});

describe('sendPaymentFailedEmail — guard rails', () => {
  it('returns no_to_address when recipient is empty', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'b@x.io';
    const r = await sendPaymentFailedEmail('', makeOpts());
    expect(r).toEqual({ ok: false, reason: 'no_to_address' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_api_key when RESEND_API_KEY is unset', async () => {
    process.env.RESEND_FROM_EMAIL = 'b@x.io';
    const r = await sendPaymentFailedEmail('user@example.com', makeOpts());
    expect(r).toEqual({ ok: false, reason: 'no_api_key' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_from_address when RESEND_FROM_EMAIL is unset', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const r = await sendPaymentFailedEmail('user@example.com', makeOpts());
    expect(r).toEqual({ ok: false, reason: 'no_from_address' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('sendPaymentFailedEmail — sending', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'TradeClaw <billing@tradeclaw.win>';
  });

  it('POSTs to Resend with bearer auth and the rendered envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_xyz' }),
    });

    const r = await sendPaymentFailedEmail('user@example.com', makeOpts());
    expect(r.ok).toBe(true);
    expect(r.providerId).toBe('email_xyz');

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('TradeClaw <billing@tradeclaw.win>');
    expect(body.to).toEqual(['user@example.com']);
    expect(body.subject).toMatch(/payment failed/i);
    expect(body.text).toContain('$29.00');
    expect(body.html).toContain('Update payment method');
  });

  it('returns provider_error on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'invalid api key' }),
    });
    const r = await sendPaymentFailedEmail('user@example.com', makeOpts());
    expect(r).toEqual({ ok: false, reason: 'provider_error' });
  });

  it('returns network_error on fetch rejection without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await sendPaymentFailedEmail('user@example.com', makeOpts());
    expect(r).toEqual({ ok: false, reason: 'network_error' });
  });
});

function makeTrialOpts(overrides: Partial<TrialEndingEmailOpts> = {}): TrialEndingEmailOpts {
  return {
    trialEndsAt: new Date('2026-05-10T12:00:00Z'),
    amountCents: 2900,
    currency: 'usd',
    ...overrides,
  };
}

describe('trial-ending builders', () => {
  it('subject signals "tomorrow"', () => {
    expect(__test__.buildTrialEndingSubject()).toMatch(/trial ends tomorrow/i);
  });

  it('plain text includes amount, end-date, and billing portal URL', () => {
    const text = __test__.buildTrialEndingText(makeTrialOpts());
    expect(text).toContain('$29.00');
    expect(text).toContain('May 10');
    expect(text).toContain('https://tradeclaw.win/dashboard/billing');
  });

  it('plain text drops the amount line gracefully when cents is 0', () => {
    const text = __test__.buildTrialEndingText(makeTrialOpts({ amountCents: 0 }));
    expect(text).not.toContain('$0.00');
    expect(text).toContain('May 10');
  });

  it('HTML uses amber accent (not red, not emerald) for the trial-ending header', () => {
    const html = __test__.buildTrialEndingHtml(makeTrialOpts());
    expect(html).toContain('#f59e0b');
    expect(html).toContain('Manage billing');
  });
});

describe('sendTrialEndingEmail', () => {
  it('returns no_api_key when env unset', async () => {
    process.env.RESEND_FROM_EMAIL = 'b@x.io';
    const r = await sendTrialEndingEmail('user@example.com', makeTrialOpts());
    expect(r).toEqual({ ok: false, reason: 'no_api_key' });
  });

  it('POSTs to Resend with the rendered envelope', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'TradeClaw <billing@tradeclaw.win>';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_trial_1' }),
    });

    const r = await sendTrialEndingEmail('user@example.com', makeTrialOpts());
    expect(r.ok).toBe(true);
    expect(r.providerId).toBe('email_trial_1');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.subject).toMatch(/trial ends tomorrow/i);
    expect(body.text).toContain('$29.00');
    expect(body.html).toContain('#f59e0b');
  });
});
