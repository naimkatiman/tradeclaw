import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));

jest.mock('../../../../../../lib/research-marketing-review-csv', () => ({
  buildResearchMarketingReviewCsv: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchMarketingReviewCsv } from '../../../../../../lib/research-marketing-review-csv';
import { GET } from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedCsv = buildResearchMarketingReviewCsv as jest.MockedFunction<
  typeof buildResearchMarketingReviewCsv
>;

function request(query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/admin/research-intake/review.csv${query}`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/review.csv', () => {
  it('authenticates before observing or serializing and leaks no queue detail when denied', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await GET(request('?taskId=TC-259'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|draft|queue|research|source|task/i);
    expect(mockedCsv).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
  });

  it('returns the complete private review attachment without interpreting filters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-29T14:59:59.999Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedCsv.mockReturnValue('queuePosition,taskId\r\n1,TC-255\r\n2,TC-257');

    const response = await GET(request('?taskId=TC-259&limit=1'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('queuePosition,taskId\r\n1,TC-255\r\n2,TC-257');
    expect(mockedCsv).toHaveBeenCalledTimes(1);
    expect(mockedCsv.mock.calls[0][0]).toEqual(new Date('2026-08-29T14:59:59.999Z'));
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-research-marketing-review-queue.csv"',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
