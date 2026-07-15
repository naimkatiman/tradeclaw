import { GET } from './route';

describe('GET /api/star-history', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('aggregates a complete GitHub timestamp series without estimates', async () => {
    const firstStar = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const secondStar = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ stargazers_count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ starred_at: firstStar }, { starred_at: secondStar }]), { status: 200 }),
      );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: true,
      source: 'github-stargazers-api',
      total: 2,
      recentGrowth: 2,
    });
    expect(body.weeks).toHaveLength(52);
    expect(body.weeks.reduce((sum: number, week: { count: number }) => sum + week.count, 0)).toBe(2);
    expect(body.weeks.at(-1).cumulative).toBe(2);
  });

  it('returns unavailable instead of generating history when GitHub fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('rate limited', { status: 403 }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      available: false,
      source: 'github',
      reason: 'github-unavailable',
      weeks: [],
      total: null,
    });
  });

  it('fails closed when the timestamp count is incomplete', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ stargazers_count: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ starred_at: new Date().toISOString() }]), { status: 200 }));

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      available: false,
      reason: 'github-count-changed',
      weeks: [],
    });
  });
});
