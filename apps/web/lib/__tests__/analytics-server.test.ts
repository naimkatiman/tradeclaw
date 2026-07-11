/**
 * Server-analytics safety: the critical guarantee is that analytics never
 * breaks a payment/auth path. When unconfigured it must be a pure no-op (no
 * client constructed, no throw); when configured it must flush immediately.
 */

const OLD_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...OLD_ENV };
  jest.resetModules();
  jest.dontMock('posthog-node');
});

describe('analytics-server', () => {
  it('is a no-op when no PostHog key is set — no client constructed, no throw', async () => {
    jest.resetModules();
    delete process.env.POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const ctor = jest.fn();
    jest.doMock('posthog-node', () => ({ PostHog: ctor }));

    const mod = await import('../analytics-server');
    await expect(mod.captureServer('signed_up', 'user-1')).resolves.toBeUndefined();
    await expect(mod.identifyServer('user-1', { tier: 'pro' })).resolves.toBeUndefined();
    expect(ctor).not.toHaveBeenCalled();
  });

  it('captures via captureImmediate (flush-on-send) when configured', async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    const captureImmediate = jest.fn().mockResolvedValue(undefined);
    const identify = jest.fn();
    const flush = jest.fn().mockResolvedValue(undefined);
    const ctor = jest.fn(() => ({ captureImmediate, identify, flush }));
    jest.doMock('posthog-node', () => ({ PostHog: ctor }));

    const mod = await import('../analytics-server');
    await mod.captureServer('trial_started', 'user-1', { tier: 'pro' });

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(captureImmediate).toHaveBeenCalledWith({
      distinctId: 'user-1',
      event: 'trial_started',
      properties: { tier: 'pro' },
    });
  });

  it('identify attaches properties and flushes', async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    const captureImmediate = jest.fn().mockResolvedValue(undefined);
    const identify = jest.fn();
    const flush = jest.fn().mockResolvedValue(undefined);
    const ctor = jest.fn(() => ({ captureImmediate, identify, flush }));
    jest.doMock('posthog-node', () => ({ PostHog: ctor }));

    const mod = await import('../analytics-server');
    await mod.identifyServer('user-1', { tier: 'free' });

    expect(identify).toHaveBeenCalledWith({ distinctId: 'user-1', properties: { tier: 'free' } });
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('swallows capture errors so the caller is never affected', async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
    const captureImmediate = jest.fn().mockRejectedValue(new Error('posthog down'));
    const ctor = jest.fn(() => ({ captureImmediate, identify: jest.fn(), flush: jest.fn() }));
    jest.doMock('posthog-node', () => ({ PostHog: ctor }));

    const mod = await import('../analytics-server');
    await expect(mod.captureServer('subscription_churned', 'user-1')).resolves.toBeUndefined();
  });
});
