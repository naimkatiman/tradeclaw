import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/user-session', () => ({
  readSessionFromRequest: jest.fn(),
}));

jest.mock('../../../../../lib/tier', () => ({
  getUserTier: jest.fn(),
}));

jest.mock('../../../../../lib/trading-agents/research-jobs', () => ({
  createResearchJob: jest.fn(),
  getResearchJob: jest.fn(),
  listResearchJobs: jest.fn(),
}));

import { readSessionFromRequest } from '../../../../../lib/user-session';
import { getUserTier } from '../../../../../lib/tier';
import {
  createResearchJob,
  getResearchJob,
  listResearchJobs,
} from '../../../../../lib/trading-agents/research-jobs';
import { GET, POST } from '../route';
import { GET as GET_BY_ID } from '../[id]/route';

const mockedReadSession = readSessionFromRequest as jest.MockedFunction<typeof readSessionFromRequest>;
const mockedGetUserTier = getUserTier as jest.MockedFunction<typeof getUserTier>;
const mockedCreateResearchJob = createResearchJob as jest.MockedFunction<typeof createResearchJob>;
const mockedGetResearchJob = getResearchJob as jest.MockedFunction<typeof getResearchJob>;
const mockedListResearchJobs = listResearchJobs as jest.MockedFunction<typeof listResearchJobs>;

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

  it('rejects free users with 403', async () => {
    mockedReadSession.mockReturnValue({ userId: 'free-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValue('free');

    const res = await POST(makeRequest('http://localhost/api/pro/research', 'POST', { symbol: 'BTCUSD' }));

    expect(res.status).toBe(403);
    expect(mockedCreateResearchJob).not.toHaveBeenCalled();
  });

  it('allows pro users to create jobs', async () => {
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValue('pro');
    mockedCreateResearchJob.mockResolvedValue({
      id: 'job-1',
      request: { symbol: 'BTCUSD', timeframe: 'H1', requestedBy: 'pro-user' },
      status: 'queued',
      analyses: [],
      createdAt: new Date('2026-05-20T00:00:00Z'),
    });

    const res = await POST(makeRequest('http://localhost/api/pro/research', 'POST', { symbol: 'BTCUSD', timeframe: 'H4' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.queued).toBe(true);
    expect(body.request.requestedBy).toBe('pro-user');
    expect(mockedCreateResearchJob).toHaveBeenCalledWith({
      symbol: 'BTCUSD',
      timeframe: 'H4',
      requestedBy: 'pro-user',
    });
  });

  it('rejects non-pro users on GET by id', async () => {
    mockedReadSession.mockReturnValue({ userId: 'free-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValue('free');

    const res = await GET_BY_ID(
      new NextRequest('http://localhost/api/pro/research/job-1'),
      { params: Promise.resolve({ id: 'job-1' }) },
    );

    expect(res.status).toBe(403);
    expect(mockedGetResearchJob).not.toHaveBeenCalled();
  });

  it('returns only the caller jobs for pro users', async () => {
    mockedReadSession.mockReturnValue({ userId: 'pro-user', issuedAt: Date.now() });
    mockedGetUserTier.mockResolvedValue('elite');
    mockedListResearchJobs.mockResolvedValue([
      {
        id: 'job-1',
        request: { symbol: 'BTCUSD', timeframe: 'H1', requestedBy: 'pro-user' },
        status: 'queued',
        analyses: [],
        createdAt: new Date('2026-05-20T00:00:00Z'),
      },
    ]);

    const res = await GET(makeRequest('http://localhost/api/pro/research'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].request.requestedBy).toBe('pro-user');
  });
});
