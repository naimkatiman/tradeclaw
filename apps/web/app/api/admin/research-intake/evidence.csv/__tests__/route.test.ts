import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

jest.mock('../../../../../../lib/research-intake-admin-evidence-csv', () => ({
  buildResearchIntakeAdminEvidenceCsv: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminEvidenceCsv } from '../../../../../../lib/research-intake-admin-evidence-csv';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedCsv = buildResearchIntakeAdminEvidenceCsv as jest.MockedFunction<
  typeof buildResearchIntakeAdminEvidenceCsv
>;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research-intake/evidence.csv${query}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/evidence.csv', () => {
  it('authenticates before observing or serializing and leaks no evidence when denied', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await route.GET(request('?taskId=TC-261&limit=1'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|evidence|receipt|draft|research|source|task/i);
    expect(mockedCsv).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns the complete private attachment without interpreting filters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T18:00:40.000Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedCsv.mockReturnValue('evidencePosition,taskId\r\n1,TC-259\r\n2,TC-261');

    const response = await route.GET(request('?taskId=TC-261&sort=sharpe&limit=1'));

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('evidencePosition,taskId\r\n1,TC-259\r\n2,TC-261');
    expect(mockedCsv).toHaveBeenCalledTimes(1);
    expect(mockedCsv.mock.calls[0][0]).toEqual(new Date('2026-08-29T18:00:40.000Z'));
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-research-admin-evidence.csv"',
    );
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('exposes only GET', () => {
    expect(route).not.toHaveProperty('HEAD');
    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
    expect(route).not.toHaveProperty('OPTIONS');
  });
});
