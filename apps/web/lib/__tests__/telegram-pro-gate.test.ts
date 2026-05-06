import { tierForChatId } from '../telegram';

const ORIG = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIG };
  delete process.env.TELEGRAM_PRO_GROUP_ID;
  delete process.env.TELEGRAM_ELITE_GROUP_ID;
});

afterAll(() => {
  process.env = ORIG;
});

describe('tierForChatId', () => {
  it('returns null when no group ids are configured', () => {
    expect(tierForChatId('-100123')).toBeNull();
  });

  it('matches the configured Pro group id', () => {
    process.env.TELEGRAM_PRO_GROUP_ID = '-100proid';
    expect(tierForChatId('-100proid')).toBe('pro');
    expect(tierForChatId('-100other')).toBeNull();
  });

  it('matches the configured Elite group id', () => {
    process.env.TELEGRAM_ELITE_GROUP_ID = '-100eliteid';
    expect(tierForChatId('-100eliteid')).toBe('elite');
  });

  it('prefers Pro when both env vars match the same id (degenerate config)', () => {
    process.env.TELEGRAM_PRO_GROUP_ID = '-100shared';
    process.env.TELEGRAM_ELITE_GROUP_ID = '-100shared';
    expect(tierForChatId('-100shared')).toBe('pro');
  });

  it('returns null for the public free channel id', () => {
    process.env.TELEGRAM_PRO_GROUP_ID = '-100pro';
    process.env.TELEGRAM_FREE_CHANNEL_ID = '-100free';
    expect(tierForChatId('-100free')).toBeNull();
  });
});
