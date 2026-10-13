import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

jest.mock('../../../../../../../lib/research-intake-admin', () => ({
  buildResearchIntakeAdminReviewItemPayload: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminReviewItemPayload } from '../../../../../../../lib/research-intake-admin';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedBuilder = buildResearchIntakeAdminReviewItemPayload as jest.MockedFunction<
  typeof buildResearchIntakeAdminReviewItemPayload
>;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(taskId: string, query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/review/${encodeURIComponent(taskId)}${query}`,
  );
}

function context(taskId: string): { params: Promise<{ taskId: string }> } {
  return { params: Promise.resolve({ taskId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/review/[taskId]', () => {
  it('authenticates before awaiting path parameters or observing the clock', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const unreadParams = {
      then: () => {
        throw new Error('path parameters were observed before authentication');
      },
    } as unknown as Promise<{ taskId: string }>;

    const response = await route.GET(request('TC-255'), { params: unreadParams });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|draft|queue|research|task/i);
    expect(mockedBuilder).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one exact private item and ignores query parameters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedBuilder.mockReturnValue({
      schemaVersion: 1,
      navigation: {
        currentPosition: 1,
        totalVisibleItems: 4,
      },
      reviewItem: {
        handoff: { taskId: 'TC-255' },
      },
    } as unknown as ReturnType<typeof buildResearchIntakeAdminReviewItemPayload>);

    const response = await route.GET(
      request('TC-255', '?limit=1&unknown=ignored'),
      context('TC-255'),
    );
    const body = await response.json();

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(response.status).toBe(200);
    expect(body.reviewItem.handoff.taskId).toBe('TC-255');
    expect(body.navigation).toMatchObject({ currentPosition: 1, totalVisibleItems: 4 });
    expect(mockedBuilder).toHaveBeenCalledTimes(1);
    expect(mockedBuilder).toHaveBeenCalledWith(
      'TC-255',
      new Date('2026-08-29T15:59:59.999Z'),
    );
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one generic non-reflective private 404', async () => {
    mockedAdmin.mockResolvedValue(null);
    mockedBuilder.mockReturnValue(null);

    const response = await route.GET(request('hidden-task'), context('hidden-task'));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Research intake marketing review not found.' });
    expect(JSON.stringify(body)).not.toContain('hidden-task');
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
  });
});
