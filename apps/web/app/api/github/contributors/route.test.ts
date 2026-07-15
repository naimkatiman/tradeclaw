import { GET } from './route';

describe('GET /api/github/contributors', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns exact GitHub contribution totals without inventing other metrics', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            login: 'alice',
            avatar_url: 'https://example.com/alice.png',
            html_url: 'https://github.com/alice',
            contributions: 17,
            type: 'User',
          },
        ]),
        { status: 200 },
      ),
    );

    const response = await GET();
    const body = await response.json();

    expect(body.available).toBe(true);
    expect(body.contributors).toEqual([
      {
        login: 'alice',
        avatarUrl: 'https://example.com/alice.png',
        profileUrl: 'https://github.com/alice',
        contributions: 17,
        rank: 1,
        isBot: false,
      },
    ]);
    expect(body.contributors[0]).not.toHaveProperty('prs');
    expect(body.contributors[0]).not.toHaveProperty('mergedPrs');
    expect(body.contributors[0]).not.toHaveProperty('issuesClosed');
  });

  it('returns unavailable and empty when GitHub fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('rate limited', { status: 403 }));

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      available: false,
      source: 'github',
      contributors: [],
      updatedAt: null,
    });
  });

  it('returns unavailable and empty on a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const response = await GET();

    await expect(response.json()).resolves.toMatchObject({
      available: false,
      contributors: [],
    });
  });
});
