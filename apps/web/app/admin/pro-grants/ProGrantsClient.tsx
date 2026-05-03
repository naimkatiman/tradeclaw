'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { grantProAction, revokeProAction, type ActionResult } from './actions';

export interface GrantRow {
  id: string;
  email: string;
  grantedBy: string;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function GrantForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    grantProAction,
    null,
  );

  return (
    <form action={action} className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Email *</span>
          <input
            name="email"
            type="email"
            required
            placeholder="user@example.com"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Note</span>
          <input
            name="note"
            type="text"
            placeholder="why this grant exists"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Expires (optional)</span>
          <input
            name="expires_at"
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </label>
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-xs ${state?.ok ? 'text-emerald-400' : 'text-red-400'}`}>
          {state?.message ?? ''}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
        >
          {pending ? 'Granting…' : 'Grant Pro'}
        </button>
      </div>
    </form>
  );
}

export function RevokeButton({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    revokeProAction,
    null,
  );
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        title={state?.message ?? `Revoke Pro for ${email}`}
        className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        <Trash2 size={12} />
        {pending ? 'Revoking…' : 'Revoke'}
      </button>
    </form>
  );
}
