/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockVerifyTelegramLogin = jest.fn();
const mockIsTelegramAuthDateFresh = jest.fn();
const mockUpsertTelegramUser = jest.fn();
const mockCreateSessionToken = jest.fn();

jest.mock('../../../../../lib/telegram-login', () => ({
  verifyTelegramLogin: (...args: unknown[]) => mockVerifyTelegramLogin(...args),
  isTelegramAuthDateFresh: (...args: unknown[]) => mockIsTelegramAuthDateFresh(...args),
}));

jest.mock('../../../../../lib/db', () => ({
  upsertTelegramUser: (...args: unknown[]) => mockUpsertTelegramUser(...args),
}));

jest.mock('../../../../../lib/user-session', () => ({
  createSessionToken: (...args: unknown[]) => mockCreateSessionToken(...args),
  sessionCookieOptions: () => ({ httpOnly: true, secure: true, maxAge: 2592000, sameSite: 'lax' as const }),
  USER_SESSION_COOKIE: 'tc_user_session',
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/telegram', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/telegram', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token:secret123';
  });

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
  });

  it('returns 503 when TELEGRAM_BOT_TOKEN is not set', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    const res = await POST(makeRequest({ id: 1, first_name: 'Test', auth_date: 1, hash: 'x' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('telegram_not_configured');
  });

  it('returns 400 for missing fields', async () => {
    const res = await POST(makeRequest({ first_name: 'Test', auth_date: 1, hash: 'x' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('missing_fields');
  });

  it('returns 401 for invalid hash', async () => {
    mockVerifyTelegramLogin.mockReturnValue(false);
    mockIsTelegramAuthDateFresh.mockReturnValue(true);
    const res = await POST(makeRequest({ id: 1, first_name: 'Test', auth_date: 1, hash: 'x' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('invalid_hash');
  });

  it('returns 401 for expired auth_date', async () => {
    mockVerifyTelegramLogin.mockReturnValue(true);
    mockIsTelegramAuthDateFresh.mockReturnValue(false);
    const res = await POST(makeRequest({ id: 1, first_name: 'Test', auth_date: 1, hash: 'x' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('auth_expired');
  });

  it('creates session and returns 200 on success', async () => {
    mockVerifyTelegramLogin.mockReturnValue(true);
    mockIsTelegramAuthDateFresh.mockReturnValue(true);
    mockUpsertTelegramUser.mockResolvedValue({ id: 'user-123' });
    mockCreateSessionToken.mockReturnValue('session_token_xyz');

    const res = await POST(
      makeRequest({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        photo_url: 'https://example.com/photo.jpg',
        auth_date: Math.floor(Date.now() / 1000),
        hash: 'validhash',
      }) as unknown as Parameters<typeof POST>[0],
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.userId).toBe('user-123');

    expect(mockUpsertTelegramUser).toHaveBeenCalledWith({
      telegramUserId: BigInt(123456789),
      displayName: 'Test User',
      avatarUrl: 'https://example.com/photo.jpg',
    });
    expect(mockCreateSessionToken).toHaveBeenCalledWith('user-123');

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('tc_user_session=session_token_xyz');
  });

  it('falls back to username when name is empty', async () => {
    mockVerifyTelegramLogin.mockReturnValue(true);
    mockIsTelegramAuthDateFresh.mockReturnValue(true);
    mockUpsertTelegramUser.mockResolvedValue({ id: 'user-123' });
    mockCreateSessionToken.mockReturnValue('session_token_xyz');

    await POST(
      makeRequest({
        id: 1,
        first_name: '',
        username: 'testuser',
        auth_date: 1,
        hash: 'x',
      }) as unknown as Parameters<typeof POST>[0],
    );

    expect(mockUpsertTelegramUser).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'testuser' }),
    );
  });

  it('falls back to "Telegram User" when no name or username', async () => {
    mockVerifyTelegramLogin.mockReturnValue(true);
    mockIsTelegramAuthDateFresh.mockReturnValue(true);
    mockUpsertTelegramUser.mockResolvedValue({ id: 'user-123' });
    mockCreateSessionToken.mockReturnValue('session_token_xyz');

    await POST(
      makeRequest({
        id: 1,
        first_name: '',
        auth_date: 1,
        hash: 'x',
      }) as unknown as Parameters<typeof POST>[0],
    );

    expect(mockUpsertTelegramUser).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Telegram User' }),
    );
  });

  it('returns 500 on upsert error', async () => {
    mockVerifyTelegramLogin.mockReturnValue(true);
    mockIsTelegramAuthDateFresh.mockReturnValue(true);
    mockUpsertTelegramUser.mockRejectedValue(new Error('db down'));

    const res = await POST(makeRequest({ id: 1, first_name: 'Test', auth_date: 1, hash: 'x' }) as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('server_error');
  });
});
