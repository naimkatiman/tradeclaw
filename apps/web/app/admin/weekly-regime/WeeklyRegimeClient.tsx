'use client';

import { useActionState, useState } from 'react';
import { Lock, Minus, TrendingUp } from 'lucide-react';
import { classifyRegime } from '../../../lib/weekly-regime/classifier';
import {
  ASSET_CLASSES,
  type AssetClass,
  type Bias,
  type ClassInput,
  type Conviction,
  type Regime,
  type WeeklyRegimeCard,
} from '../../../lib/weekly-regime/types';
import { setWeeklyRegimeAction, type ActionResult } from './actions';

interface WeeklyRegimeClientProps {
  initialCard: WeeklyRegimeCard | null;
}

const BIAS_OPTIONS: readonly Bias[] = ['LONG', 'SHORT', 'NONE'];
const CONVICTION_OPTIONS: readonly Conviction[] = [0, 1, 2, 3];

const CLASS_LABELS: Record<AssetClass, string> = {
  crypto: 'Crypto',
  commodities: 'Commodities',
  stocks: 'Stocks',
  forex: 'Forex',
  indices: 'Indices',
};

function emptyRow(): ClassInput {
  return { bias: 'NONE', conviction: 0, thesis: '' };
}

function rowFromCard(card: WeeklyRegimeCard | null, cls: AssetClass): ClassInput {
  const entry = card?.classes[cls];
  if (!entry) return emptyRow();
  return { bias: entry.bias, conviction: entry.conviction, thesis: entry.thesis };
}

function RegimeBadge({ regime }: { regime: Regime }) {
  if (regime === 'TRENDING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
        <TrendingUp size={12} />
        TRENDING
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-500/30 bg-zinc-500/10 px-2 py-1 text-xs font-semibold text-zinc-400">
      <Minus size={12} />
      NEUTRAL
    </span>
  );
}

export function WeeklyRegimeClient({ initialCard }: WeeklyRegimeClientProps) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setWeeklyRegimeAction,
    null,
  );

  const [rows, setRows] = useState<Record<AssetClass, ClassInput>>(() => {
    const init = {} as Record<AssetClass, ClassInput>;
    for (const cls of ASSET_CLASSES) {
      init[cls] = rowFromCard(initialCard, cls);
    }
    return init;
  });

  const [overrideOn, setOverrideOn] = useState(false);

  function updateRow(cls: AssetClass, patch: Partial<ClassInput>): void {
    setRows((prev) => ({ ...prev, [cls]: { ...prev[cls], ...patch } }));
  }

  const blockedNeedsOverride = state?.ok === false && state.requiresOverride === true;

  return (
    <form action={action} className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Asset class</th>
              <th className="px-4 py-2.5 font-medium">Bias</th>
              <th className="px-4 py-2.5 font-medium">Conviction</th>
              <th className="px-4 py-2.5 font-medium">Thesis</th>
              <th className="px-4 py-2.5 font-medium text-right">Preview</th>
            </tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((cls) => {
              const row = rows[cls];
              const regime = classifyRegime({ bias: row.bias, conviction: row.conviction });
              return (
                <tr key={cls} className="border-t border-white/[0.04] align-top">
                  <td className="px-4 py-3 font-semibold text-white">{CLASS_LABELS[cls]}</td>
                  <td className="px-4 py-3">
                    <select
                      name={`${cls}_bias`}
                      value={row.bias}
                      onChange={(e) => updateRow(cls, { bias: e.target.value as Bias })}
                      className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                    >
                      {BIAS_OPTIONS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      name={`${cls}_conviction`}
                      value={String(row.conviction)}
                      onChange={(e) =>
                        updateRow(cls, { conviction: Number(e.target.value) as Conviction })
                      }
                      className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none"
                    >
                      {CONVICTION_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      name={`${cls}_thesis`}
                      type="text"
                      value={row.thesis}
                      onChange={(e) => updateRow(cls, { thesis: e.target.value })}
                      placeholder="one-line thesis"
                      className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RegimeBadge regime={regime} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Override — only matters once the Monday-noon KL lock cutoff has passed. */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-amber-300">
          <input
            type="checkbox"
            name="override"
            checked={overrideOn}
            onChange={(e) => setOverrideOn(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/40 accent-amber-500"
          />
          <Lock size={14} />
          Override post-cutoff lock
        </label>
        <p className="mt-1 text-xs text-amber-200/70">
          Only needed after Monday 12:00 (Asia/Kuala_Lumpur). A reason is required to override.
        </p>
        {overrideOn && (
          <input
            name="override_reason"
            type="text"
            placeholder="reason for the post-cutoff override"
            className="mt-3 w-full rounded-md border border-amber-500/30 bg-black/40 px-3 py-2 text-sm text-white placeholder-amber-200/40 focus:border-amber-400/60 focus:outline-none"
          />
        )}
      </div>

      {state && (
        <p
          className={`text-sm ${state.ok ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {state.message}
          {blockedNeedsOverride && (
            <span className="mt-1 block text-xs text-amber-300">
              Past the Monday-noon lock — tick &ldquo;Override post-cutoff lock&rdquo;, give a
              reason, and resubmit.
            </span>
          )}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/40"
        >
          <Lock size={14} />
          {pending ? 'Locking…' : 'Confirm & lock weekly regime'}
        </button>
      </div>
    </form>
  );
}
