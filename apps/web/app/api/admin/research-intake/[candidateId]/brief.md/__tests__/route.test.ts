import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));
jest.mock(
  '../../../../../../../lib/research-intake-admin-candidate-brief',
  () => ({
    buildResearchIntakeAdminCandidateBrief: jest.fn(),
  }),
);

import { assertAdminApi } from '../../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminCandidateBrief } from '../../../../../../../lib/research-intake-admin-candidate-brief';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedBrief = buildResearchIntakeAdminCandidateBrief as jest.MockedFunction<
  typeof buildResearchIntakeAdminCandidateBrief
>;
const CANDIDATE_ID = 'a-risk-based-approach-to-tactical-asset-allocation';
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(candidateId: string, query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/${encodeURIComponent(candidateId)}/brief.md${query}`,
  );
}

function context(candidateId: string): {
  params: Promise<{ candidateId: string }>;
} {
  return { params: Promise.resolve({ candidateId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/[candidateId]/brief.md', () => {
  it('authenticates before reading path parameters, the clock, or candidate state', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const unreadParams = {
      then: () => {
        throw new Error('path parameters were observed before authentication');
      },
    } as unknown as Promise<{ candidateId: string }>;

    const response = await route.GET(request('hidden-candidate'), {
      params: unreadParams,
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockedBrief).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one inline private Markdown record from one server instant', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T15:58:04.123Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedBrief.mockReturnValue('# Exact protected record\n');

    const response = await route.GET(
      request(CANDIDATE_ID, '?q=ignored&limit=1'),
      context(CANDIDATE_ID),
    );
    const body = await response.text();

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(mockedBrief).toHaveBeenCalledTimes(1);
    expect(mockedBrief).toHaveBeenCalledWith(
      CANDIDATE_ID,
      new Date('2026-08-30T15:58:04.123Z'),
    );
    expect(response.status).toBe(200);
    expect(body).toBe('# Exact protected record\n');
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="tradeclaw-research-admin-candidate-brief.md"',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one generic non-reflective private Markdown 404', async () => {
    mockedAdmin.mockResolvedValue(null);
    mockedBrief.mockReturnValue(null);

    for (const candidateId of [
      'missing-candidate',
      CANDIDATE_ID.toUpperCase(),
      ` ${CANDIDATE_ID}`,
    ]) {
      const response = await route.GET(request(candidateId), context(candidateId));
      const body = await response.text();

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toBe(
        'text/markdown; charset=utf-8',
      );
      expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
      expect(response.headers.get('vary')).toBe('Cookie, Authorization');
      expect(body).toBe(
        '# Research intake candidate not found\n\nResearch intake candidate not found. Use an exact canonical candidate ID.\n',
      );
      expect(body).not.toContain(candidateId);
    }
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
