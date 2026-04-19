import { upgradeRequiredBody, type UpgradeRequiredBody } from '../tier';

describe('tier — upgradeRequiredBody', () => {
  it('builds a minimal body with no limit block', () => {
    const body: UpgradeRequiredBody = upgradeRequiredBody({
      reason: 'API access requires Pro.',
      source: 'api-keys',
    });
    expect(body.error).toBe('upgrade_required');
    expect(body.reason).toBe('API access requires Pro.');
    expect(body.upgradeUrl).toBe('/pricing?from=api-keys');
    expect(body.limit).toBeUndefined();
  });

  it('embeds a rate limit block when provided', () => {
    const body = upgradeRequiredBody({
      reason: 'Quota hit.',
      source: 'explain-quota',
      limit: { kind: 'rate', used: 10, max: 10, windowHours: 24 },
    });
    expect(body.limit).toEqual({ kind: 'rate', used: 10, max: 10, windowHours: 24 });
  });

  it('embeds a count limit block when provided', () => {
    const body = upgradeRequiredBody({
      reason: 'At cap.',
      source: 'alert-rules',
      limit: { kind: 'count', used: 3, max: 3 },
    });
    expect(body.limit).toEqual({ kind: 'count', used: 3, max: 3 });
  });

  it('URL-encodes the source tag in the upgrade URL', () => {
    const body = upgradeRequiredBody({
      reason: 'x',
      source: 'signal detail',
    });
    expect(body.upgradeUrl).toBe('/pricing?from=signal%20detail');
  });
});
