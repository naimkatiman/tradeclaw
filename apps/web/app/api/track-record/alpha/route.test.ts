jest.mock('@/lib/d1-alpha-ledger', () => ({
  readD1AlphaReport: jest.fn(),
  unavailableD1AlphaReport: jest.fn(() => ({
    status: 'collecting-evidence',
    label: 'collecting evidence',
    promotion: 'not-promoted',
    metrics: null,
  })),
}));

import {
  readD1AlphaReport,
  unavailableD1AlphaReport,
} from '@/lib/d1-alpha-ledger';
import { GET } from './route';

const mockedRead = readD1AlphaReport as jest.MockedFunction<typeof readD1AlphaReport>;

beforeEach(() => {
  mockedRead.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/track-record/alpha', () => {
  it('returns the prospective report without pretending it is current', async () => {
    mockedRead.mockResolvedValue({
      status: 'collecting-evidence',
      label: 'collecting evidence',
      promotion: 'not-promoted',
      metrics: null,
    } as Awaited<ReturnType<typeof readD1AlphaReport>>);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'collecting-evidence',
      label: 'collecting evidence',
      promotion: 'not-promoted',
      metrics: null,
    });
    expect(mockedRead).toHaveBeenCalledWith({ recentLimit: 5_000 });
    expect(response.headers.get('cache-control')).toContain('s-maxage=300');
  });

  it('fails closed with a sanitized unavailable report', async () => {
    mockedRead.mockRejectedValue(new Error('password=secret'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(unavailableD1AlphaReport).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(body.metrics).toBeNull();
  });
});
