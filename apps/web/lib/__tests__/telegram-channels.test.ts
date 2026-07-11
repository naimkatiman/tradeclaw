import {
  getBotToken,
  getFreeChannelId,
} from '../telegram-channels';

const ORIG = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIG };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_FREE_CHANNEL_ID;
  delete process.env.TELEGRAM_PUBLIC_CHANNEL_ID;
  delete process.env.TELEGRAM_CHANNEL_ID;
});

afterAll(() => {
  process.env = ORIG;
});

describe('getBotToken', () => {
  it('returns null when env is unset', () => {
    expect(getBotToken()).toBeNull();
  });
  it('returns the env value', () => {
    process.env.TELEGRAM_BOT_TOKEN = '123:abc';
    expect(getBotToken()).toBe('123:abc');
  });
});

describe('getFreeChannelId — backwards-compat fallback chain', () => {
  it('returns null when none of the three names is set', () => {
    expect(getFreeChannelId()).toBeNull();
  });

  it('prefers the canonical TELEGRAM_FREE_CHANNEL_ID', () => {
    process.env.TELEGRAM_FREE_CHANNEL_ID = '-100free';
    process.env.TELEGRAM_PUBLIC_CHANNEL_ID = '-100legacy1';
    process.env.TELEGRAM_CHANNEL_ID = '-100legacy2';
    expect(getFreeChannelId()).toBe('-100free');
  });

  it('falls back to TELEGRAM_PUBLIC_CHANNEL_ID when canonical is unset', () => {
    process.env.TELEGRAM_PUBLIC_CHANNEL_ID = '-100legacy1';
    process.env.TELEGRAM_CHANNEL_ID = '-100legacy2';
    expect(getFreeChannelId()).toBe('-100legacy1');
  });

  it('falls back to TELEGRAM_CHANNEL_ID when both newer names are unset', () => {
    process.env.TELEGRAM_CHANNEL_ID = '-100legacy2';
    expect(getFreeChannelId()).toBe('-100legacy2');
  });
});
