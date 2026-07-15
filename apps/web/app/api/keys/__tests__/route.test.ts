import { NextRequest } from 'next/server';

jest.mock('../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../lib/db', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../../../../lib/api-keys', () => ({
  createKey: jest.fn(),
  deleteKey: jest.fn(),
  listKeysByEmail: jest.fn(),
  toggleKey: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../lib/user-session';
import { getUserById } from '../../../../lib/db';
import {
  deleteKey,
  listKeysByEmail,
  toggleKey,
} from '../../../../lib/api-keys';
import { GET } from '../route';
import { DELETE, PATCH } from '../[id]/route';

const mockedSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetUser = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedList = listKeysByEmail as jest.MockedFunction<typeof listKeysByEmail>;
const mockedDelete = deleteKey as jest.MockedFunction<typeof deleteKey>;
const mockedToggle = toggleKey as jest.MockedFunction<typeof toggleKey>;

const user = {
  id: 'user-1',
  email: 'owner@example.com',
  telegramUserId: null,
  displayName: null,
  avatarUrl: null,
  authProvider: null,
};

const key = {
  id: 'key-1',
  key: 'tc_live_0123456789abcdef0123456789abcdef',
  name: 'Owner key',
  email: user.email,
  description: '',
  scopes: ['signals'] as ('signals' | 'leaderboard' | 'screener')[],
  createdAt: 1,
  lastUsedAt: null,
  requestCount: 0,
  rateLimit: 100,
  status: 'active' as const,
  active: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('API-key ownership', () => {
  it('rejects unauthenticated key listing', async () => {
    mockedSession.mockReturnValue(null);

    const response = await GET(new NextRequest('http://localhost/api/keys'));

    expect(response.status).toBe(401);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('lists only the signed-in owner keys and masks the secret', async () => {
    mockedSession.mockReturnValue({ userId: user.id, issuedAt: 1 });
    mockedGetUser.mockResolvedValue(user);
    mockedList.mockReturnValue([key]);

    const response = await GET(new NextRequest('http://localhost/api/keys'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedList).toHaveBeenCalledWith(user.email);
    expect(body.keys).toHaveLength(1);
    expect(body.keys[0].key).not.toBe(key.key);
    expect(body.keys[0].key).toMatch(/^tc_live_0123\*+$/);
  });

  it('rejects an email lookup for another account', async () => {
    mockedSession.mockReturnValue({ userId: user.id, issuedAt: 1 });
    mockedGetUser.mockResolvedValue(user);

    const response = await GET(
      new NextRequest('http://localhost/api/keys?email=other@example.com'),
    );

    expect(response.status).toBe(403);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it('does not delete a key the signed-in user does not own', async () => {
    mockedSession.mockReturnValue({ userId: user.id, issuedAt: 1 });
    mockedGetUser.mockResolvedValue(user);
    mockedList.mockReturnValue([]);

    const response = await DELETE(
      new NextRequest('http://localhost/api/keys/other', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'other' }) },
    );

    expect(response.status).toBe(404);
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it('deletes a key owned by the signed-in user', async () => {
    mockedSession.mockReturnValue({ userId: user.id, issuedAt: 1 });
    mockedGetUser.mockResolvedValue(user);
    mockedList.mockReturnValue([key]);
    mockedDelete.mockReturnValue(true);

    const response = await DELETE(
      new NextRequest('http://localhost/api/keys/key-1', { method: 'DELETE' }),
      { params: Promise.resolve({ id: key.id }) },
    );

    expect(response.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith(key.id);
  });

  it('does not toggle a key the signed-in user does not own', async () => {
    mockedSession.mockReturnValue(null);

    const response = await PATCH(
      new NextRequest('http://localhost/api/keys/key-1', { method: 'PATCH' }),
      { params: Promise.resolve({ id: key.id }) },
    );

    expect(response.status).toBe(404);
    expect(mockedToggle).not.toHaveBeenCalled();
  });
});
