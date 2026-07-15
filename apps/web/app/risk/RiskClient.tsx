'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Shield } from 'lucide-react';

interface GateState {
  mode: string;
  gatesAllow: boolean;
  reason: string;
  regime: string;
  streakLossCount: number;
  currentDrawdownPct: number;
  dataPoints: number;
  thresholds: Record<string, unknown>;
  volMultiplier: number;
  effectiveDrawdownThreshold: number;
}

export function RiskClient() {
  const [state, setState] = useState<GateState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/risk/gate-state', { cache: 'no-store' });
      const body = await response.json() as GateState | { error?: string };
      if (!response.ok || !('gatesAllow' in body)) {
        throw new Error('error' in body && body.error ? body.error : 'Gate state unavailable');
      }
      setState(body);
      setError(null);
    } catch (cause) {
      setState(null);
      setError(cause instanceof Error ? cause.message : 'Gate state unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-24 text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-rose-400">
              <Shield className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase">Signal-history gate</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Observed risk-gate state</h1>
            <p className="mt-4 max-w-2xl leading-7 text-[var(--text-secondary)]">
              This is a gate computed from recorded, OHLCV-resolved signal outcomes. Drawdown is
              a sequential signal-study statistic, not broker equity, account balance, portfolio
              loss, or proof that an order was filled.
            </p>
          </div>
          <button
            aria-label="Refresh risk gate"
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-white/5"
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </section>

        {error ? (
          <section className="border border-rose-500/30 bg-rose-500/5 p-5 text-sm text-rose-300">
            Gate state unavailable: {error}
          </section>
        ) : null}

        {state ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Decision', state.gatesAllow ? 'allow' : 'block'],
              ['Mode', state.mode],
              ['Reason', state.reason],
              ['Resolved sample', state.dataPoints.toLocaleString()],
              ['Study drawdown', `${state.currentDrawdownPct.toFixed(2)}%`],
              ['Loss streak', state.streakLossCount.toLocaleString()],
              ['Regime', state.regime],
              ['Volatility multiplier', state.volMultiplier.toFixed(2)],
              ['Effective threshold', `${state.effectiveDrawdownThreshold.toFixed(2)}%`],
            ].map(([label, value]) => (
              <div className="border border-[var(--border)] bg-[var(--card-bg)] p-5" key={label}>
                <p className="text-xs uppercase text-[var(--text-secondary)]">{label}</p>
                <p className="mt-2 break-words font-mono text-sm">{value}</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
