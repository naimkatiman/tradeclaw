import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

jest.mock('../../../../../../lib/research-intake-admin', () => ({
  buildResearchIntakeAdminReviewPayload: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminReviewPayload } from '../../../../../../lib/research-intake-admin';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedBuilder = buildResearchIntakeAdminReviewPayload as jest.MockedFunction<
  typeof buildResearchIntakeAdminReviewPayload
>;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research-intake/review${query}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/review', () => {
  it('authenticates before observing the clock or building queue data', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await route.GET(request('?taskId=TC-259&limit=1'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|draft|queue|research|source|task/i);
    expect(mockedBuilder).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns the complete private queue without interpreting filters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T15:59:59.999Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedBuilder.mockReturnValue({
      schemaVersion: 1,
      queue: {
        items: [
          { handoff: { taskId: 'TC-255' } },
          { handoff: { taskId: 'TC-259' } },
        ],
      },
    } as unknown as ReturnType<typeof buildResearchIntakeAdminReviewPayload>);

    const response = await route.GET(request('?taskId=TC-259&limit=1&unknown=ignored'));
    const body = await response.json();

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(response.status).toBe(200);
    expect(body.queue.items.map((item: { handoff: { taskId: string } }) => item.handoff.taskId))
      .toEqual(['TC-255', 'TC-259']);
    expect(mockedBuilder).toHaveBeenCalledTimes(1);
    expect(mockedBuilder.mock.calls[0][0]).toEqual(new Date('2026-08-29T15:59:59.999Z'));
    expect(response.headers.get('content-type')).toContain('application/json');
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
