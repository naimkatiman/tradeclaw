import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { runRegimeWriter, type RegimeWriterFailure } from '../../../../lib/regime-writer';
import { parseOpsAdminIds } from '../../../../lib/telegram-ops-commands';
import { escapeHtml, sendTelegramMessage } from '../../../../lib/telegram-send';

// Hourly market_regimes writer — Phase 3 regime engine, plan D8
// (docs/plans/2026-06-11-phase3-regime-engine.md). Scheduled via
// /api/cron/sync (hourly slot, minute < 10); the writer's own 30-minute
// idempotency window absorbs double-ticks and multi-replica double-fires.
//
// Failure-mode discipline: a run that completed but wrote ZERO rows is the
// exact failure shape that kept this layer invisibly dead for months, so it
// pushes an immediate ops Telegram alert — and when OPS_TELEGRAM_ADMIN_IDS
// is unset, that fact is surfaced in the response JSON instead of letting
// the alert silently no-op.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_ALERT_FAILURE_LINES = 10;

type ZeroWrittenAlert =
  | { alert: 'ops_admin_ids_not_configured' }
  | { alert: 'zero_written_alert'; alertSent: number; alertFailed: number };

async function sendZeroWrittenAlert(
  processed: number,
  failures: RegimeWriterFailure[],
): Promise<ZeroWrittenAlert> {
  const adminIds = parseOpsAdminIds();
  if (adminIds.size === 0) {
    return { alert: 'ops_admin_ids_not_configured' };
  }

  const lines = [
    '<b>TradeClaw regime writer wrote 0 rows</b>',
    '',
    `Processed ${processed} symbols, ${failures.length} failure(s):`,
    ...failures
      .slice(0, MAX_ALERT_FAILURE_LINES)
      .map((f) => `<code>${escapeHtml(f.symbol)}</code> ${f.stage}: ${escapeHtml(f.error)}`),
  ];
  if (failures.length > MAX_ALERT_FAILURE_LINES) {
    lines.push(`… +${failures.length - MAX_ALERT_FAILURE_LINES} more`);
  }
  const body = lines.join('\n');

  const results = await Promise.all(
    Array.from(adminIds).map((chatId) => sendTelegramMessage(chatId, body)),
  );
  const sent = results.filter((r) => r.ok).length;
  return { alert: 'zero_written_alert', alertSent: sent, alertFailed: results.length - sent };
}

export async function GET(request: NextRequest): Promise<Response> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const t0 = Date.now();
  try {
    const result = await runRegimeWriter();

    let alert: ZeroWrittenAlert | undefined;
    if (!result.skipped && result.written === 0) {
      alert = await sendZeroWrittenAlert(result.processed, result.failures);
    }

    return NextResponse.json({
      ok: true,
      ...result,
      ...(alert ?? {}),
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/regime] failed:', msg);
    return NextResponse.json({ ok: false, error: msg, durationMs: Date.now() - t0 }, { status: 500 });
  }
}
