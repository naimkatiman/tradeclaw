import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));
jest.mock('../../../../../lib/db', () => ({
  getUserById: jest.fn(),
  getUserSubscription: jest.fn(),
  countRecentTelegramInvites: jest.fn(),
}));
jest.mock('../../../../../lib/telegram', () => ({
  sendInviteWithRetry: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import {
  getUserById,
  getUserSubscription,
  countRecentTelegramInvites,
} from '../../../../../lib/db';
import { sendInviteWithRetry } from '../../../../../lib/telegram';
import { POST } from '../route';

const mockedSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedGetSub = getUserSubscription as jest.MockedFunction<typeof getUserSubscription>;
const mockedCount = countRecentTelegramInvites as jest.MockedFunction<typeof countRecentTelegramInvites>;
const mockedSend = sendInviteWithRetry as jest.MockedFunction<typeof sendInviteWithRetry>;

function makeRequest() {
  return new NextRequest('http://localhost/api/telegram/resend-invite', { method: 'POST' });
}

function arrangeProUserWithLinkedTelegram() {
  mockedSession.mockReturnValueOnce({ userId: 'user-1', issuedAt: Date.now() });
  mockedGetUser.mockResolvedValueOnce({
    id: 'user-1',
    email: 'pro@example.com',
    stripeCustomerId: null,
    tier: 'pro',
    tierExpiresAt: null,
    telegramUserId: BigInt(99999),
  });
  mockedGetSub.mockResolvedValueOnce({
    id: 'sub-row-1',
    userId: 'user-1',
    stripeSubscriptionId: 'sub_1',
    stripeCustomerId: 'cus_1',
    tier: 'pro',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    cancelAtPeriodEnd: false,
    trialEnd: null,
    trialReminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockedCount.mockResolvedValueOnce(0);
}

describe('POST /api/telegram/resend-invite — error-code mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps "chat not found" to chat_not_found 409', async () => {
    arrangeProUserWithLinkedTelegram();
    mockedSend.mockResolvedValueOnce({
      ok: false,
      attempts: 1,
      retryable: false,
      error: 'Telegram API error (getChat): Bad Request: chat not found',
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('chat_not_found');
  });

  it('maps "bot was blocked" to bot_blocked 409', async () => {
    arrangeProUserWithLinkedTelegram();
    mockedSend.mockResolvedValueOnce({
      ok: false,
      attempts: 1,
      retryable: false,
      error: 'Telegram API error (sendMessage): Forbidden: bot was blocked by the user',
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe('bot_blocked');
  });

  it('falls back to send_failed 502 for unrecognized telegram errors', async () => {
    arrangeProUserWithLinkedTelegram();
    mockedSend.mockResolvedValueOnce({
      ok: false,
      attempts: 3,
      retryable: true,
      error: 'ECONNRESET',
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe('send_failed');
    expect(body.retryable).toBe(true);
    expect(body.attempts).toBe(3);
  });

  it('returns 200 ok on successful send', async () => {
    arrangeProUserWithLinkedTelegram();
    mockedSend.mockResolvedValueOnce({
      ok: true,
      attempts: 1,
      retryable: true,
      inviteLink: 'https://t.me/+xyz',
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
