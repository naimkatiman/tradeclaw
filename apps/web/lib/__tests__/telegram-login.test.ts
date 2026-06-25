import { createHash, createHmac } from 'node:crypto';
import {
  verifyTelegramLogin,
  isTelegramAuthDateFresh,
  type TelegramLoginData,
} from '../telegram-login';

function makeHash(data: Omit<TelegramLoginData, 'hash'>, botToken: string): string {
  // Exclude hash if present at runtime so the helper matches verifyTelegramLogin exactly.
  const { hash: _hash, ...rest } = data as TelegramLoginData;
  const entries = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));
  const checkString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHash('sha256').update(botToken).digest();
  return createHmac('sha256', secret).update(checkString).digest('hex');
}

function buildLoginData(
  overrides: Partial<TelegramLoginData> = {},
): TelegramLoginData {
  const base = {
    id: 123456789,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    photo_url: 'https://t.me/i/userpic/320/testuser.jpg',
    auth_date: Math.floor(Date.now() / 1000),
    hash: '',
  };
  const merged = { ...base, ...overrides };
  merged.hash = makeHash(merged, 'test_bot_token:secret123');
  return merged as TelegramLoginData;
}

describe('telegram-login', () => {
  describe('verifyTelegramLogin', () => {
    it('returns true for valid hash', () => {
      const data = buildLoginData();
      expect(verifyTelegramLogin(data, 'test_bot_token:secret123')).toBe(true);
    });

    it('returns false for wrong bot token', () => {
      const data = buildLoginData();
      expect(verifyTelegramLogin(data, 'wrong_token')).toBe(false);
    });

    it('returns false for tampered field', () => {
      const data = buildLoginData({ first_name: 'Hacked' });
      // hash was computed for 'Hacked', so it should still be valid for that data
      // but if we keep the original hash and change the field:
      const original = buildLoginData();
      const tampered = { ...original, first_name: 'Hacked' };
      expect(verifyTelegramLogin(tampered, 'test_bot_token:secret123')).toBe(false);
    });

    it('returns false for tampered hash', () => {
      const data = buildLoginData();
      data.hash = data.hash.slice(0, -1) + 'x';
      expect(verifyTelegramLogin(data, 'test_bot_token:secret123')).toBe(false);
    });

    it('handles optional fields omitted', () => {
      const data = buildLoginData({
        last_name: undefined,
        username: undefined,
        photo_url: undefined,
      });
      expect(verifyTelegramLogin(data, 'test_bot_token:secret123')).toBe(true);
    });
  });

  describe('isTelegramAuthDateFresh', () => {
    it('returns true for recent auth_date', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTelegramAuthDateFresh(now - 60)).toBe(true);
    });

    it('returns false for future auth_date', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTelegramAuthDateFresh(now + 60)).toBe(false);
    });

    it('returns false for auth_date older than 24h', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTelegramAuthDateFresh(now - 25 * 60 * 60)).toBe(false);
    });

    it('returns true for auth_date exactly 24h old', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTelegramAuthDateFresh(now - 24 * 60 * 60)).toBe(true);
    });
  });
});
