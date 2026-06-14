'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../../lib/admin-gate';
import { setWeeklyRegime } from '../../../lib/weekly-regime/service';
import {
  ASSET_CLASSES,
  type Bias,
  type Conviction,
  type ClassInput,
  type RegimeInput,
} from '../../../lib/weekly-regime/types';

export interface ActionResult {
  ok: boolean;
  message: string;
  /** Set true when the write was blocked by the Monday-noon lock and needs an override. */
  requiresOverride?: boolean;
}

/** Narrow a raw form value to a {@link Bias} literal (defaults to NONE). */
function toBias(v: string): Bias {
  if (v === 'LONG') return 'LONG';
  if (v === 'SHORT') return 'SHORT';
  return 'NONE';
}

/** Narrow a raw form value to a {@link Conviction} literal (defaults to 0). */
function toConviction(v: string): Conviction {
  const n = Number(v);
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 0;
}

/** Read one class's row from the posted form into a {@link ClassInput}. */
function readClassInput(formData: FormData, cls: string): ClassInput {
  return {
    bias: toBias(String(formData.get(`${cls}_bias`) ?? '')),
    conviction: toConviction(String(formData.get(`${cls}_conviction`) ?? '')),
    thesis: String(formData.get(`${cls}_thesis`) ?? '').trim(),
  };
}

export async function setWeeklyRegimeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Re-check on every action: the page's render-time requireAdmin() does not
  // protect this endpoint, which the form posts to directly.
  const grant = await requireAdmin();

  const input = {} as RegimeInput;
  for (const cls of ASSET_CLASSES) {
    input[cls] = readClassInput(formData, cls);
  }

  const override = String(formData.get('override') ?? '') === 'on';
  const reason = String(formData.get('override_reason') ?? '').trim();

  try {
    const result = await setWeeklyRegime(input, {
      setBy: grant.email ?? 'tc_admin',
      via: grant.via,
      override,
      reason,
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.error ?? 'Write blocked.',
        requiresOverride: result.requiresOverride,
      };
    }

    revalidatePath('/admin/weekly-regime');
    return {
      ok: true,
      message: `Weekly regime locked for week of ${result.card?.week_start ?? 'this week'}.`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, message: `Set failed: ${message}` };
  }
}
