import {
  getBotToken,
  getFreeChannelId,
  getProGroupId,
  getEliteGroupId,
} from '../telegram-channels';

const ORIG = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIG };
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_FREE_CHANNEL_ID;
  delete process.env.TELEGRAM_PUBLIC_CHANNEL_ID;
  delete process.env.TELEGRAM_CHANNEL_ID;
  delete process.env.TELEGRAM_PRO_GROUP_ID;
  delete process.env.TELEGRAM_ELITE_GROUP_ID;
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

describe('getProGroupId', () => {
  it('returns null when unset', () => {
    expect(getProGroupId()).toBeNull();
  });
  it('does NOT fall back to free channel ids — Pro is its own channel', () => {
    process.env.TELEGRAM_FREE_CHANNEL_ID = '-100free';
    process.env.TELEGRAM_PUBLIC_CHANNEL_ID = '-100legacy';
    expect(getProGroupId()).toBeNull();
  });
  it('returns the env value when set', () => {
    process.env.TELEGRAM_PRO_GROUP_ID = '-100pro';
    expect(getProGroupId()).toBe('-100pro');
  });
});

describe('getEliteGroupId', () => {
  it('returns null when unset', () => {
    expect(getEliteGroupId()).toBeNull();
  });
  it('returns the env value when set', () => {
    process.env.TELEGRAM_ELITE_GROUP_ID = '-100elite';
    expect(getEliteGroupId()).toBe('-100elite');
  });
});
