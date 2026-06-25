import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/cron-auth';
import { loadTodayCounts } from '../../../../lib/ops-dashboard';
import { checkRegimeHealth, type RegimeHealth } from '../../../../lib/regime-health';
import {
  parseOpsAdminIds,
  renderTodayMessage,
} from '../../../../lib/telegram-ops-commands';
import { escapeHtml, sendTelegramMessage } from '../../../../lib/telegram-send';

// Daily ops digest — pushes the "Today" panel to every OPS_TELEGRAM_ADMIN_IDS
// recipient. Scheduled via /api/cron/sync at hour=23 UTC.
// Plan: docs/plans/2026-05-13-tradeclaw-ops-dashboard.md (Layer 3 PR 3).
//
// Idempotency: not enforced at the route level. The /api/cron/sync caller is
// the rate-limit boundary (one slot per 24h, minute < 10). Manual triggers
// via curl will re-send — expected behavior for an admin-only push surface.

export const dynamic = 'force-dynamic';

interface DigestResult {
  ok: boolean;
  adminCount: number;
  sent: number;
  failures: Array<{ chatId: string; error: string }>;
}

function renderRegimeHealthSection(health: RegimeHealth): string {
  const lines: string[] = ['<b>Regime health (last 24h)</b>'];
  lines.push(
    `Rows: <b>${health.regimeRows24h}</b> · symbols: <b>${health.distinctSymbols24h}</b> · ` +
      `latest: <code>${escapeHtml(health.latestDetectedAt ?? 'never')}</code>`,
  );
  if (health.staleRegime) {
    lines.push('⚠ regime map stale (latest row over 2h old, or none)');
  }
  if (health.allOneLabel24h.allOne) {
    lines.push(
      `⚠ all 24h rows carry one label: <code>${escapeHtml(health.allOneLabel24h.label ?? '')}</code>`,
    );
  }
  if (health.staleCandles.length > 0) {
    const list = health.staleCandles
      .map((c) => `${c.symbol} (${c.latestTs === null ? 'none' : new Date(c.latestTs).toISOString()})`)
      .join(', ');
    lines.push(`⚠ stale H1 candles: ${escapeHtml(list)}`);
  }
  if (!health.staleRegime && !health.allOneLabel24h.allOne && health.staleCandles.length === 0) {
    lines.push('All checks passing.');
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const adminIds = parseOpsAdminIds();
  if (adminIds.size === 0) {
    return NextResponse.json({
      ok: false,
      error: 'OPS_TELEGRAM_ADMIN_IDS not configured',
      adminCount: 0,
      sent: 0,
      failures: [],
    } satisfies DigestResult & { error: string });
  }

  let body: string;
  try {
    const today = await loadTodayCounts();
    body = renderTodayMessage(today);
  } catch (err) {
    // Per plan: on data-fetch failure send a short notice rather than skipping.
    body =
      '<b>TradeClaw Ops digest — data fetch failed</b>\n\n' +
      `<code>${err instanceof Error ? err.message : 'unknown error'}</code>`;
  }

  // Regime-health section (Phase 3, plan D8): direct-SQL freshness check so
  // a dead regime layer is visible in the daily digest. A health-check
  // failure must not kill the digest — it degrades to an explicit line.
  try {
    body += '\n\n' + renderRegimeHealthSection(await checkRegimeHealth());
  } catch (err) {
    body +=
      '\n\n⚠ regime health check failed: ' +
      `<code>${escapeHtml(err instanceof Error ? err.message : 'unknown error')}</code>`;
  }

  const results = await Promise.all(
    Array.from(adminIds).map(async (chatId) => ({
      chatId,
      result: await sendTelegramMessage(chatId, body),
    })),
  );

  const failures = results
    .filter((r) => !r.result.ok)
    .map((r) => ({ chatId: r.chatId, error: r.result.error ?? 'unknown' }));

  const payload: DigestResult = {
    ok: failures.length === 0,
    adminCount: adminIds.size,
    sent: results.length - failures.length,
    failures,
  };

  return NextResponse.json(payload);
}
