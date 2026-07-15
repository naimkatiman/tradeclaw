import { GET } from './route';

describe('GET /api/sponsors', () => {
  it('returns an explicit unavailable state without fabricated records or revenue', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: false,
      source: null,
      sponsors: [],
      totalSponsors: null,
      monthlyRevenueUsd: null,
    });
    expect(body.message).toContain('No estimated or placeholder records');
  });
});
