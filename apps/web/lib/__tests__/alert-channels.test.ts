import {
  formatTelegramText,
  formatDiscordEmbed,
  sendTelegramDm,
  sendDiscordWebhook,
  sendGenericWebhook,
  sendEmail,
  sendToChannel,
  type AlertSignal,
} from '../alert-channels';

const ORIG_ENV = { ...process.env };

function makeSignal(overrides: Partial<AlertSignal> = {}): AlertSignal {
  return {
    id: 'sig-1',
    symbol: 'BTCUSD',
    timeframe: 'H1',
    direction: 'BUY',
    confidence: 76,
    entry: 67800,
    stopLoss: 67000,
    takeProfit1: 68500,
    ...overrides,
  };
}

beforeEach(() => {
  process.env = { ...ORIG_ENV };
  global.fetch = jest.fn();
});

afterAll(() => {
  process.env = ORIG_ENV;
});

describe('formatTelegramText', () => {
  it('escapes MarkdownV2 special characters', () => {
    const text = formatTelegramText(makeSignal({ symbol: 'BTC.USD' }));
    expect(text).toContain('BTC\\.USD');
  });

  it('omits TP2/TP3 when not provided', () => {
    const text = formatTelegramText(makeSignal());
    expect(text).toContain('TP1');
    expect(text).not.toContain('TP2');
  });
});

describe('formatDiscordEmbed', () => {
  it('uses green color for BUY and red for SELL', () => {
    const buy = formatDiscordEmbed(makeSignal({ direction: 'BUY' }));
    const sell = formatDiscordEmbed(makeSignal({ direction: 'SELL' }));
    expect((buy.embeds[0] as { color: number }).color).toBe(0x10b981);
    expect((sell.embeds[0] as { color: number }).color).toBe(0xef4444);
  });

  it('includes only TP/SL fields that are present', () => {
    const embed = formatDiscordEmbed(makeSignal({ takeProfit2: null, takeProfit3: null }));
    const fields = (embed.embeds[0] as { fields: { name: string }[] }).fields;
    const names = fields.map((f) => f.name);
    expect(names).toContain('TP1');
    expect(names).not.toContain('TP2');
  });
});

describe('sendTelegramDm', () => {
  it('returns false without a chatId', async () => {
    const ok = await sendTelegramDm({}, makeSignal());
    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns false when no botToken in config and no env fallback', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const ok = await sendTelegramDm({ chatId: '123' }, makeSignal());
    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to TELEGRAM_BOT_TOKEN env var when config has only chatId', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'env-token';
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    const ok = await sendTelegramDm({ chatId: '123' }, makeSignal());
    expect(ok).toBe(true);
    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('env-token');
  });

  it('returns false when Telegram API returns ok:false', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ ok: false }) });
    const ok = await sendTelegramDm({ chatId: '123', botToken: 't' }, makeSignal());
    expect(ok).toBe(false);
  });

  it('returns false on network error without throwing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('net'));
    const ok = await sendTelegramDm({ chatId: '123', botToken: 't' }, makeSignal());
    expect(ok).toBe(false);
  });
});

describe('sendDiscordWebhook', () => {
  it('returns false without a webhookUrl', async () => {
    const ok = await sendDiscordWebhook({}, makeSignal());
    expect(ok).toBe(false);
  });

  it('POSTs the embed payload to the configured webhook', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const ok = await sendDiscordWebhook(
      { webhookUrl: 'https://discord.example/hook' },
      makeSignal(),
    );
    expect(ok).toBe(true);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://discord.example/hook');
    const body = JSON.parse(init.body);
    expect(body.embeds[0].title).toContain('BUY');
  });

  it('returns false on non-2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const ok = await sendDiscordWebhook(
      { webhookUrl: 'https://discord.example/hook' },
      makeSignal(),
    );
    expect(ok).toBe(false);
  });
});

describe('sendGenericWebhook', () => {
  it('returns false without a url', async () => {
    const ok = await sendGenericWebhook({}, makeSignal());
    expect(ok).toBe(false);
  });

  it('POSTs the signal as JSON with X-TradeClaw-Source header', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const ok = await sendGenericWebhook({ url: 'https://api.example/hook' }, makeSignal());
    expect(ok).toBe(true);
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(init.headers['X-TradeClaw-Source']).toBe('alert-rules');
    expect(init.headers['X-TradeClaw-Secret']).toBeUndefined();
  });

  it('attaches X-TradeClaw-Secret when config.secret is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await sendGenericWebhook(
      { url: 'https://api.example/hook', secret: 'shhh' },
      makeSignal(),
    );
    const init = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(init.headers['X-TradeClaw-Secret']).toBe('shhh');
  });
});

describe('sendEmail', () => {
  it('returns false (stub — no email provider wired in apps/web yet)', async () => {
    const ok = await sendEmail({ to: 'user@example.com' }, makeSignal());
    expect(ok).toBe(false);
  });
});

describe('sendToChannel — dispatcher', () => {
  it('routes telegram channel to sendTelegramDm', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 't';
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    const ok = await sendToChannel('telegram', { chatId: '1' }, makeSignal());
    expect(ok).toBe(true);
    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('api.telegram.org');
  });

  it('routes discord channel to sendDiscordWebhook', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const ok = await sendToChannel(
      'discord',
      { webhookUrl: 'https://discord.example/hook' },
      makeSignal(),
    );
    expect(ok).toBe(true);
    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('discord.example');
  });

  it('routes webhook channel to sendGenericWebhook', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const ok = await sendToChannel('webhook', { url: 'https://api.example/h' }, makeSignal());
    expect(ok).toBe(true);
  });

  it('returns false for the email stub', async () => {
    const ok = await sendToChannel('email', { to: 'a@b.c' }, makeSignal());
    expect(ok).toBe(false);
  });
});
