'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface BrokerPayload {
  available: boolean;
  error?: string;
  source?: string;
  observedAt?: string;
  accountInfo?: Record<string, unknown>;
  positions?: Array<Record<string, unknown>>;
}

function money(value: unknown, currency: string) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(number)
    : 'Unavailable';
}

export default function BrokerAccountClient() {
  const [payload, setPayload] = useState<BrokerPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/broker', { cache: 'no-store' });
      const body = await response.json() as BrokerPayload;
      setPayload(body);
    } catch {
      setPayload({ available: false, error: 'Broker account data is unavailable.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const account = payload?.accountInfo;
  const positions = payload?.positions ?? [];
  const currency = typeof account?.currency === 'string' ? account.currency : 'USD';

  return (
    <main className="min-h-[100dvh] bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-6">
          <div>
            <h1 className="text-2xl font-bold">Broker account viewer</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Admin-only, read-only data from a server-configured MetaApi account.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} title="Refresh broker data" className="rounded-md border border-[var(--border)] p-2 text-[var(--text-secondary)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {loading && !payload ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading configured account...</p>
        ) : !payload?.available || !account ? (
          <div className="border-l-2 border-amber-400 pl-4">
            <h2 className="font-semibold text-amber-300">Unavailable</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{payload?.error ?? 'No observed broker account data was returned.'}</p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-5 border-y border-[var(--border)] py-6 md:grid-cols-4">
              {[
                ['Balance', money(account.balance, currency)],
                ['Equity', money(account.equity, currency)],
                ['Open P&L', money(account.profit, currency)],
                ['Free margin', money(account.freeMargin, currency)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs uppercase text-[var(--text-secondary)]">{label}</p>
                  <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
                </div>
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Open positions ({positions.length})</h2>
                <p className="text-xs text-[var(--text-secondary)]">Observed {payload.observedAt ? new Date(payload.observedAt).toLocaleString() : 'time unavailable'}</p>
              </div>
              {positions.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">MetaApi returned no open positions.</p>
              ) : (
                <div className="overflow-x-auto border-y border-[var(--border)]">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-[var(--text-secondary)]"><tr><th className="py-3">Symbol</th><th>Type</th><th className="text-right">Volume</th><th className="text-right">Open</th><th className="text-right">Current</th><th className="text-right">P&amp;L</th></tr></thead>
                    <tbody>{positions.map((position, index) => (
                      <tr key={String(position.id ?? index)} className="border-t border-[var(--border)] font-mono">
                        <td className="py-3">{String(position.symbol ?? 'Unavailable')}</td>
                        <td>{String(position.type ?? 'Unavailable').replace('POSITION_TYPE_', '')}</td>
                        <td className="text-right">{Number(position.volume) || 0}</td>
                        <td className="text-right">{Number(position.openPrice) || 0}</td>
                        <td className="text-right">{Number(position.currentPrice) || 0}</td>
                        <td className="text-right">{money(position.profit, currency)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
