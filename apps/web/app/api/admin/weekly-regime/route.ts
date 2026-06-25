import { NextResponse, type NextRequest } from 'next/server';
import {
  getCurrentWeeklyRegime,
  setWeeklyRegime,
} from '../../../../lib/weekly-regime/service';
import { validateRegimeInput } from '../../../../lib/weekly-regime/validator';
import {
  assertAdminApi,
  getAdminIdentityFromRequest,
} from '../../../../lib/admin-gate';

// Hits Postgres + Redis via the service layer — must run on the Node runtime.
export const runtime = 'nodejs';

/** POST body shape the admin client sends. */
interface SetRegimeBody {
  input: unknown;
  override?: boolean;
  reason?: string;
}

/**
 * GET /api/admin/weekly-regime — return the current KL-week regime card
 * (or null if none set yet). Admin-gated.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return denied;

  const card = await getCurrentWeeklyRegime();
  return NextResponse.json({ card });
}

/**
 * POST /api/admin/weekly-regime — set this week's regime card.
 * Body: { input: RegimeInput, override?: boolean, reason?: string }.
 * Admin-gated; attribution + audit log handled inside `setWeeklyRegime`.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const denied = await assertAdminApi(request);
  if (denied) return denied;

  let body: SetRegimeBody;
  try {
    body = (await request.json()) as SetRegimeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateRegimeInput(body?.input);
  if (!validation.ok) {
    return NextResponse.json(
      { error: 'Invalid regime input', details: validation.errors },
      { status: 400 },
    );
  }

  const identity = await getAdminIdentityFromRequest(request);
  const setBy = identity?.email ?? 'tc_admin';
  const via = identity?.via ?? 'secret';

  const result = await setWeeklyRegime(validation.input, {
    setBy,
    via,
    override: body.override === true,
    reason: body.reason,
  });

  if (!result.ok) {
    // A post-cutoff write without a valid override is the expected conflict.
    const status = result.requiresOverride ? 409 : 400;
    return NextResponse.json(
      { error: result.error, requiresOverride: result.requiresOverride ?? false },
      { status },
    );
  }

  return NextResponse.json({ ok: true, card: result.card });
}
