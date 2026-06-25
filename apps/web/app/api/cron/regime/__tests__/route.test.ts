/**
 * Regime cron route tests — Phase 3 regime engine, plan D8
 * (docs/plans/2026-06-11-phase3-regime-engine.md).
 *
 * The lib tests carry the writer logic; this covers the route's own
 * responsibilities: auth passthrough, the zero-written ops alert, and the
 * explicit surfacing of an unconfigured OPS_TELEGRAM_ADMIN_IDS.
 */

import { NextRequest } from 'next/server';

jest.mock('../../../../../lib/cron-auth', () => ({
  requireCronAuth: jest.fn(),
}));

jest.mock('../../../../../lib/regime-writer', () => ({
  runRegimeWriter: jest.fn(),
}));

jest.mock('../../../../../lib/telegram-ops-commands', () => ({
  parseOpsAdminIds: jest.fn(),
}));

jest.mock('../../../../../lib/telegram-send', () => ({
  sendTelegramMessage: jest.fn(),
  escapeHtml: (v: string) => v,
}));

import { requireCronAuth } from '../../../../../lib/cron-auth';
import { runRegimeWriter } from '../../../../../lib/regime-writer';
import { parseOpsAdminIds } from '../../../../../lib/telegram-ops-commands';
import { sendTelegramMessage } from '../../../../../lib/telegram-send';
import { GET } from '../route';

const mockedRequireCronAuth = requireCronAuth as jest.MockedFunction<typeof requireCronAuth>;
const mockedRunRegimeWriter = runRegimeWriter as jest.MockedFunction<typeof runRegimeWriter>;
const mockedParseOpsAdminIds = parseOpsAdminIds as jest.MockedFunction<typeof parseOpsAdminIds>;
const mockedSendTelegramMessage = sendTelegramMessage as jest.MockedFunction<
  typeof sendTelegramMessage
>;

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/cron/regime');
}

describe('regime cron route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireCronAuth.mockReturnValue(null);
    mockedParseOpsAdminIds.mockReturnValue(new Set(['111', '222']));
    mockedSendTelegramMessage.mockResolvedValue({ ok: true });
  });

  it('passes through cron auth failures', async () => {
    const denied = new Response(null, { status: 401 });
    mockedRequireCronAuth.mockReturnValue(denied as never);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockedRunRegimeWriter).not.toHaveBeenCalled();
  });

  it('returns the writer summary without alerting when rows were written', async () => {
    mockedRunRegimeWriter.mockResolvedValue({
      skipped: false,
      processed: 10,
      written: 10,
      failures: [],
      durationMs: 5,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.written).toBe(10);
    expect(body.alert).toBeUndefined();
    expect(mockedSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('does not alert on an idempotency skip', async () => {
    mockedRunRegimeWriter.mockResolvedValue({ skipped: true, reason: 'inside window' });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(mockedSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('sends the zero-written ops alert to every configured admin', async () => {
    mockedRunRegimeWriter.mockResolvedValue({
      skipped: false,
      processed: 10,
      written: 0,
      failures: [{ symbol: 'BTCUSD', stage: 'data', error: 'only 12 stored H1 bars' }],
      durationMs: 5,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.alert).toBe('zero_written_alert');
    expect(body.alertSent).toBe(2);
    expect(body.alertFailed).toBe(0);
    expect(mockedSendTelegramMessage).toHaveBeenCalledTimes(2);
    const [, text] = mockedSendTelegramMessage.mock.calls[0];
    expect(text).toContain('0 rows');
    expect(text).toContain('BTCUSD');
  });

  it('surfaces an unconfigured OPS_TELEGRAM_ADMIN_IDS instead of silently no-oping', async () => {
    mockedParseOpsAdminIds.mockReturnValue(new Set());
    mockedRunRegimeWriter.mockResolvedValue({
      skipped: false,
      processed: 10,
      written: 0,
      failures: [],
      durationMs: 5,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alert).toBe('ops_admin_ids_not_configured');
    expect(mockedSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when the writer throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedRunRegimeWriter.mockRejectedValue(new Error('db down'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('db down');
    consoleSpy.mockRestore();
  });
});
