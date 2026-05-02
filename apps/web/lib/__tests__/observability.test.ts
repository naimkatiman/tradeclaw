import { recordBroadcastResult } from '../observability';

describe('recordBroadcastResult', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs at info severity when nothing was attempted', () => {
    recordBroadcastResult({
      source: 'telegram_pro_broadcast',
      attempted: 0,
      sent: 0,
      failed: 0,
      reason: 'no_signals',
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    const line = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(line.severity).toBe('info');
    expect(line.kind).toBe('broadcast_result');
    expect(line.source).toBe('telegram_pro_broadcast');
    expect(line.reason).toBe('no_signals');
  });

  it('logs at info severity on a clean success', () => {
    recordBroadcastResult({
      source: 'alert_rules_dispatch',
      attempted: 5,
      sent: 5,
      failed: 0,
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs at warning severity on partial failure', () => {
    recordBroadcastResult({
      source: 'telegram_pro_broadcast',
      attempted: 4,
      sent: 3,
      failed: 1,
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    const line = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(line.severity).toBe('warning');
  });

  it('logs at error severity when every send failed', () => {
    recordBroadcastResult({
      source: 'telegram_pro_broadcast',
      attempted: 3,
      sent: 0,
      failed: 3,
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(line.severity).toBe('error');
  });

  it('emits a stable JSON shape with kind + ts', () => {
    recordBroadcastResult({
      source: 'alert_rules_dispatch',
      attempted: 1,
      sent: 1,
      failed: 0,
      meta: { user_count: 7 },
    });
    const line = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(line.kind).toBe('broadcast_result');
    expect(typeof line.ts).toBe('string');
    expect(line.meta).toEqual({ user_count: 7 });
  });

  it('never throws even on degenerate input', () => {
    expect(() =>
      recordBroadcastResult({
        // @ts-expect-error intentionally malformed
        source: undefined,
        attempted: NaN,
        sent: -1,
        failed: -1,
      }),
    ).not.toThrow();
  });
});
