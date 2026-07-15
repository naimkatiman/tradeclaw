import { GET } from './route';

describe('GET /api/data/providers', () => {
  it('does not turn configuration metadata into fabricated health checks', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.summary.healthMeasured).toBe(false);
    expect(body.summary.measuredHealthy).toBe(0);
    expect(body.providers.length).toBeGreaterThan(0);
    expect(body.providers.every((provider: { status: string; lastCheck: number | null }) =>
      ['unverified', 'unconfigured'].includes(provider.status) && provider.lastCheck === null,
    )).toBe(true);
    expect(body.note).toMatch(/not been probed/i);
  });
});
