import { NextResponse } from 'next/server';
import { collectServerData, buildExportPayload } from '../../../lib/data-export';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export — full server data dump (alerts, paper-trading,
 * webhooks, plugins, telegram subscribers).
 *
 * The dump is **instance-global** (no per-user scoping). On a single-
 * tenant self-host deploy that's the operator's own data and the
 * endpoint works as intended. On a multi-tenant hosted deploy it would
 * leak every user's data, so the hosted deploy sets
 * TRADECLAW_DISABLE_GLOBAL_EXPORT=true to turn this route off.
 *
 * Self-hosters leave the env unset and keep the export they've always
 * had. No behavior change for them.
 */
export async function GET() {
  if (process.env.TRADECLAW_DISABLE_GLOBAL_EXPORT === 'true') {
    return NextResponse.json(
      {
        error: 'export_disabled',
        reason:
          'Instance-wide export is disabled on this deploy. Use your account data page to export your own data.',
      },
      { status: 410 },
    );
  }

  try {
    const serverData = collectServerData();
    const payload = buildExportPayload(serverData);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
