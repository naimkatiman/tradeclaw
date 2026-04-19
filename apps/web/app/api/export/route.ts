import { NextRequest, NextResponse } from 'next/server';
import { collectServerData, buildExportPayload } from '../../../lib/data-export';
import { readSessionFromRequest } from '../../../lib/user-session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/export — data dump.
 *
 * Three modes:
 *
 * 1. `TRADECLAW_DISABLE_GLOBAL_EXPORT=true` on the instance → route is off
 *    entirely, returns 410 Gone. Set this on multi-tenant hosted deploys.
 *
 * 2. Caller has a signed-in session → per-user scoped dump. Today the
 *    file-backed data stores don't carry a userId, so scoped calls return
 *    empty alerts/webhooks/plugins/telegram arrays (fail-safe: never leak
 *    another user's records). The Portfolio object is returned because paper
 *    trading is session-local on the browser; the server just initializes a
 *    default shell.
 *
 * 3. Anonymous caller, route not disabled → global dump. Intended for
 *    single-tenant self-hosts where the instance's data = the operator's data.
 */
export async function GET(request: NextRequest) {
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
    const session = readSessionFromRequest(request);
    const serverData = await collectServerData(session?.userId);
    const payload = buildExportPayload(serverData);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
