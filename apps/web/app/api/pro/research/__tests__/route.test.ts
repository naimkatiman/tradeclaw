/**
 * /api/pro/research auth tests. The tier gate is gone — sign-in is still
 * required for reads (jobs are per-user), but job CREATION is admin-only:
 * each job drains through an LLM pipeline and the removed Pro-payment
 * barrier was its only abuse guard.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../../lib/trading-agents/research-jobs', () => ({
  createResearchJob: jest.fn(),
  getResearchJob: jest.fn(),
  listResearchJobs: jest.fn(),
}));

jest.mock('../../../../../lib/db', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../../../../../lib/admin-emails', () => ({
  isAdminEmail: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import {
  createResearchJob,
  getResearchJob,
  listResearchJobs,
} from '../../../../../lib/trading-agents/research-jobs';
import { getUserById } from '../../../../../lib/db';
import { isAdminEmail } from '../../../../../lib/admin-emails';
import { GET, POST } from '../route';
import { GET as GET_BY_ID } from '../[id]/route';

const mockedReadSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedCreateResearchJob = createResearchJob as jest.MockedFunction<typeof createResearchJob>;
const mockedGetResearchJob = getResearchJob as jest.MockedFunction<typeof getResearchJob>;
const mockedListResearchJobs = listResearchJobs as jest.MockedFunction<typeof listResearchJobs>;
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedIsAdminEmail = isAdminEmail as jest.MockedFunction<typeof isAdminEmail>;

function makeRequest(url: string, method: 'GET' | 'POST' = 'GET', body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

describe('GET/POST /api/pro/research auth gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects anonymous requests with 401', async () => {
    mockedReadSession.mockReturnValue(null);

    const res = await POST(makeRequest('http://localhost/api/pro/research', 'POST', { symbol: 'BTCUSD' }));

    expect(res.status).toBe(401);
    expect(mockedCreateResearchJob).not.toHaveBeenCalled();
  });

  it('rejects signed-in non-admin job creation with 403', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedGetUserById.mockResolvedValue({ id: 'user-1', email: 'someone@example.com' } as never);
    mockedIsAdminEmail.mockReturnValue(false);

    const res = await POST(makeRequest('http://localhost/api/pro/research', 'POST', { symbol: 'BTCUSD', timeframe: 'H4' }));

    expect(res.status).toBe(403);
    expect(mockedCreateResearchJob).not.toHaveBeenCalled();
  });

  it('allows admin job creation', async () => {
    mockedReadSession.mockReturnValue({ userId: 'admin-1', issuedAt: Date.now() });
    mockedGetUserById.mockResolvedValue({ id: 'admin-1', email: 'owner@example.com' } as never);
    mockedIsAdminEmail.mockReturnValue(true);
    mockedCreateResearchJob.mockResolvedValue({
      id: 'job-1',
      request: { symbol: 'BTCUSD', timeframe: 'H4', requestedBy: 'admin-1' },
      status: 'queued',
      analyses: [],
      createdAt: new Date('2026-05-20T00:00:00Z'),
    });

    const res = await POST(makeRequest('http://localhost/api/pro/research', 'POST', { symbol: 'BTCUSD', timeframe: 'H4' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.queued).toBe(true);
    expect(body.request.requestedBy).toBe('admin-1');
    expect(mockedCreateResearchJob).toHaveBeenCalledWith({
      symbol: 'BTCUSD',
      timeframe: 'H4',
      requestedBy: 'admin-1',
    });
  });

  it('rejects anonymous GET by id with 401', async () => {
    mockedReadSession.mockReturnValue(null);

    const res = await GET_BY_ID(
      new NextRequest('http://localhost/api/pro/research/job-1'),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(res.status).toBe(401);
    expect(mockedGetResearchJob).not.toHaveBeenCalled();
  });

  it('hides other users jobs behind a 404 on GET by id', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-2', issuedAt: Date.now() });
    mockedGetResearchJob.mockResolvedValue({
      id: 'job-1',
      request: { symbol: 'BTCUSD', timeframe: 'H1', requestedBy: 'someone-else' },
      status: 'queued',
      analyses: [],
      createdAt: new Date('2026-05-20T00:00:00Z'),
    });

    const res = await GET_BY_ID(
      new NextRequest('http://localhost/api/pro/research/job-1'),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(res.status).toBe(404);
  });

  it('returns only the caller jobs on list', async () => {
    mockedReadSession.mockReturnValue({ userId: 'user-1', issuedAt: Date.now() });
    mockedListResearchJobs.mockResolvedValue([
      {
        id: 'job-1',
        request: { symbol: 'BTCUSD', timeframe: 'H1', requestedBy: 'user-1' },
        status: 'queued',
        analyses: [],
        createdAt: new Date('2026-05-20T00:00:00Z'),
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/pro/research'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].request.requestedBy).toBe('user-1');
    expect(mockedListResearchJobs).toHaveBeenCalledWith('user-1', 20);
  });
});
