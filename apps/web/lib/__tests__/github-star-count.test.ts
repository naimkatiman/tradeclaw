import { parseGitHubStarCount } from '../github-star-count';

describe('parseGitHubStarCount', () => {
  it('accepts measured non-negative integer counts', () => {
    expect(parseGitHubStarCount({ stars: 0 })).toBe(0);
    expect(parseGitHubStarCount({ stars: 1234 })).toBe(1234);
  });

  it.each([
    undefined,
    null,
    {},
    { stars: undefined },
    { stars: '123' },
    { stars: -1 },
    { stars: 1.5 },
    { stars: Number.POSITIVE_INFINITY },
  ])('rejects unavailable or malformed metrics: %p', (payload) => {
    expect(parseGitHubStarCount(payload)).toBeNull();
  });
});
