import {
  sendSignalEmail,
  buildSubject,
  buildPlainText,
  buildHtml,
} from '../email-sender';
import type { AlertSignal } from '../alert-channels';

const ORIG = { ...process.env };

function makeSignal(overrides: Partial<AlertSignal> = {}): AlertSignal {
  return {
    id: 's1',
    symbol: 'XAUUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 78,
    entry: 2410.5,
    stopLoss: 2400,
    takeProfit1: 2420,
    takeProfit2: 2430,
    takeProfit3: 2445,
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

describe('buildSubject / buildPlainText / buildHtml', () => {
  it('subject leads with direction + symbol + confidence', () => {
    expect(buildSubject(makeSignal())).toBe('BUY XAUUSD — 78% (H1)');
  });

  it('plain text body lists all TP levels when present', () => {
    const text = buildPlainText(makeSignal());
    expect(text).toContain('TP1:');
    expect(text).toContain('TP2:');
    expect(text).toContain('TP3:');
    expect(text).toMatch(/^SL:/m);
  });

  it('plain text omits TP2/TP3/SL lines that are missing', () => {
    const text = buildPlainText(
      makeSignal({ takeProfit2: null, takeProfit3: null, stopLoss: null }),
    );
    expect(text).toContain('TP1');
    expect(text).not.toContain('TP2');
    expect(text).not.toContain('TP3');
    expect(text).not.toMatch(/^SL:/m);
  });

  it('HTML body uses red color for SELL, green for BUY', () => {
    const buy = buildHtml(makeSignal({ direction: 'BUY' }));
    const sell = buildHtml(makeSignal({ direction: 'SELL' }));
    expect(buy).toContain('#10b981');
    expect(sell).toContain('#ef4444');
  });
});

describe('sendSignalEmail — guard rails', () => {
  it('returns no_to_address when recipient is empty', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 's@x.io';
    const r = await sendSignalEmail('', makeSignal());
    expect(r).toEqual({ ok: false, reason: 'no_to_address' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_api_key when RESEND_API_KEY is unset', async () => {
    process.env.RESEND_FROM_EMAIL = 's@x.io';
    const r = await sendSignalEmail('user@example.com', makeSignal());
    expect(r).toEqual({ ok: false, reason: 'no_api_key' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns no_from_address when RESEND_FROM_EMAIL is unset', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const r = await sendSignalEmail('user@example.com', makeSignal());
    expect(r).toEqual({ ok: false, reason: 'no_from_address' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('sendSignalEmail — sending', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.RESEND_FROM_EMAIL = 'TradeClaw <signals@tradeclaw.win>';
  });

  it('POSTs to Resend API with bearer auth and the signed envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_abc' }),
    });

    const r = await sendSignalEmail('user@example.com', makeSignal());
    expect(r.ok).toBe(true);
    expect(r.providerId).toBe('email_abc');

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(init.body);
    expect(body.from).toBe('TradeClaw <signals@tradeclaw.win>');
    expect(body.to).toEqual(['user@example.com']);
    expect(body.subject).toContain('BUY XAUUSD');
    expect(typeof body.text).toBe('string');
    expect(typeof body.html).toBe('string');
  });

  it('returns provider_error on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'invalid api key' }),
    });
    const r = await sendSignalEmail('user@example.com', makeSignal());
    expect(r).toEqual({ ok: false, reason: 'provider_error' });
  });

  it('returns network_error on fetch rejection without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await sendSignalEmail('user@example.com', makeSignal());
    expect(r).toEqual({ ok: false, reason: 'network_error' });
  });
});
