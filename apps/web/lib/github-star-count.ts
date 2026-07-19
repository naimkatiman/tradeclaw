/** Parse the external GitHub metric without turning missing data into a fake zero. */
export function parseGitHubStarCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const stars = (payload as { stars?: unknown }).stars;
  return typeof stars === 'number' && Number.isSafeInteger(stars) && stars >= 0
    ? stars
    : null;
}
