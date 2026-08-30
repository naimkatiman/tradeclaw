import { NextRequest, NextResponse } from 'next/server';

jest.mock('../../../../../../lib/admin-gate', () => ({
  assertAdminApi: jest.fn(),
}));
jest.mock('../../../../../../lib/research-intake-admin-cycle-brief', () => ({
  buildResearchIntakeAdminCycleBrief: jest.fn(),
}));

import { assertAdminApi } from '../../../../../../lib/admin-gate';
import { buildResearchIntakeAdminCycleBrief } from '../../../../../../lib/research-intake-admin-cycle-brief';
import * as route from '../route';

const mockedAdmin = assertAdminApi as jest.MockedFunction<typeof assertAdminApi>;
const mockedBrief = buildResearchIntakeAdminCycleBrief as jest.MockedFunction<
  typeof buildResearchIntakeAdminCycleBrief
>;
const PRIVATE_CACHE = 'private, no-store, max-age=0';

function request(query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/brief.md${query}`,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('GET /api/admin/research-intake/brief.md', () => {
  it('authenticates before observing the clock or building research state', async () => {
    mockedAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await route.GET(request('?unknown=ignored'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockedBrief).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one inline private Markdown brief from one server instant', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-30T13:00:26.528Z'));
    mockedAdmin.mockResolvedValue(null);
    mockedBrief.mockReturnValue('# TradeClaw research cycle brief\n');

    const response = await route.GET(request('?limit=1&unknown=ignored'));
    const body = await response.text();

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(mockedBrief).toHaveBeenCalledTimes(1);
    expect(mockedBrief.mock.calls[0][0]).toEqual(
      new Date('2026-08-30T13:00:26.528Z'),
    );
    expect(response.status).toBe(200);
    expect(body).toBe('# TradeClaw research cycle brief\n');
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
    expect(response.headers.get('content-disposition')).toBe(
      'inline; filename="tradeclaw-research-cycle-brief.md"',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
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
