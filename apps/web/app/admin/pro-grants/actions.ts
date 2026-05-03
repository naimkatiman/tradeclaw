'use server';

import 'server-only';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../../../lib/admin-gate';
import { addProEmailGrant, revokeProEmailGrant } from '../../../lib/db';
import { invalidateProGrantsCache } from '../../../lib/admin-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function grantProAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Re-check on every action: relying on the page's requireAdmin() at render
  // time isn't enough — the action endpoint is called directly by the form.
  const grant = await requireAdmin();
  const grantedBy = grant.email ?? 'tc_admin';

  const emailRaw = String(formData.get('email') ?? '').trim();
  const noteRaw = String(formData.get('note') ?? '').trim();
  const expiresRaw = String(formData.get('expires_at') ?? '').trim();

  if (!emailRaw) return { ok: false, message: 'Email is required.' };
  if (!EMAIL_RE.test(emailRaw)) return { ok: false, message: 'Email looks invalid.' };

  let expiresAt: Date | null = null;
  if (expiresRaw) {
    const d = new Date(expiresRaw);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, message: 'Expires-at is not a valid date.' };
    }
    if (d.getTime() <= Date.now()) {
      return { ok: false, message: 'Expires-at must be in the future.' };
    }
    expiresAt = d;
  }

  try {
    await addProEmailGrant(emailRaw, grantedBy, noteRaw || null, expiresAt);
    invalidateProGrantsCache();
    revalidatePath('/admin/pro-grants');
    return { ok: true, message: `Granted Pro to ${emailRaw.toLowerCase()}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, message: `Grant failed: ${message}` };
  }
}

export async function revokeProAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const grant = await requireAdmin();
  const revokedBy = grant.email ?? 'tc_admin';

  const emailRaw = String(formData.get('email') ?? '').trim();
  if (!emailRaw) return { ok: false, message: 'Email is required.' };

  try {
    const ok = await revokeProEmailGrant(emailRaw, revokedBy);
    invalidateProGrantsCache();
    revalidatePath('/admin/pro-grants');
    if (!ok) return { ok: false, message: `No active grant found for ${emailRaw.toLowerCase()}.` };
    return { ok: true, message: `Revoked Pro for ${emailRaw.toLowerCase()}.` };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, message: `Revoke failed: ${message}` };
  }
}
