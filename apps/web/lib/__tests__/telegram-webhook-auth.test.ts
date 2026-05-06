import { NextRequest } from 'next/server';
import { verifyTelegramWebhook } from '../telegram-webhook-auth';

function buildRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/telegram', { method: 'POST', headers });
}

describe('verifyTelegramWebhook', () => {
  const ORIGINAL = process.env.TELEGRAM_WEBHOOK_SECRET;

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    } else {
      process.env.TELEGRAM_WEBHOOK_SECRET = ORIGINAL;
    }
  });

  it('returns 503 when TELEGRAM_WEBHOOK_SECRET is unset', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const res = verifyTelegramWebhook(buildRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it('returns 401 when secret-token header is missing', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'tg-webhook-secret-12345';
    const res = verifyTelegramWebhook(buildRequest());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when secret-token header is wrong', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'tg-webhook-secret-12345';
    const res = verifyTelegramWebhook(
      buildRequest({ 'x-telegram-bot-api-secret-token': 'nope' }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns null when secret-token header matches', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'tg-webhook-secret-12345';
    const res = verifyTelegramWebhook(
      buildRequest({ 'x-telegram-bot-api-secret-token': 'tg-webhook-secret-12345' }),
    );
    expect(res).toBeNull();
  });
});
