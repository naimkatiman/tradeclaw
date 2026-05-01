import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowLeft, ShieldCheck, TrendingUp, TrendingDown, Globe2 } from 'lucide-react';
import { requireAdmin } from '../../../lib/admin-gate';
import { query, queryOne } from '../../../lib/db-pool';

export const metadata: Metadata = {
  title: 'Pilot Executions | TradeClaw Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface ExecRow {
  id: string;
  signal_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: string;
  entry_price: string | null;
  stop_price: string | null;
  tp1_price: string | null;
  leverage: number;
  notional_usd: string | null;
  risk_usd: string | null;
  status: string;
  filled_at: string | null;
  closed_at: string | null;
  realized_pnl: string | null;
  mode: string;
  created_at: string;
}

interface ErrorRow {
  id: string;
  signal_id: string | null;
  stage: string;
  error_code: string | null;
  error_msg: string;
  created_at: string;
}

interface UniverseRow {
  symbol: string;
  ef_ratio: string;
  vol_24h_usd: string;
}

async function loadOpen(): Promise<ExecRow[]> {
  try {
    return await query<ExecRow>(
      `SELECT id, signal_id, symbol, side, qty, entry_price, stop_price, tp1_price,
              leverage, notional_usd, risk_usd, status,
              filled_at::text, closed_at::text, realized_pnl, mode, created_at::text
         FROM executions
        WHERE status IN ('pending','filled','partially_filled')
        ORDER BY created_at DESC
        LIMIT 50`,
    );
  } catch {
    return [];
  }
}

async function loadRecentClosed(): Promise<ExecRow[]> {
  try {
    return await query<ExecRow>(
      `SELECT id, signal_id, symbol, side, qty, entry_price, stop_price, tp1_price,
              leverage, notional_usd, risk_usd, status,
              filled_at::text, closed_at::text, realized_pnl, mode, created_at::text
         FROM executions
        WHERE status IN ('closed','cancelled','rejected')
        ORDER BY closed_at DESC NULLS LAST, created_at DESC
        LIMIT 50`,
    );
  } catch {
    return [];
  }
}

async function loadRecentErrors(): Promise<ErrorRow[]> {
  try {
    return await query<ErrorRow>(
      `SELECT id, signal_id, stage, error_code, error_msg, created_at::text
         FROM execution_errors
        ORDER BY created_at DESC
        LIMIT 30`,
    );
  } catch {
    return [];
  }
}

async function loadTodayUniverse(): Promise<UniverseRow[]> {
  try {
    return await query<UniverseRow>(
      `SELECT symbol, ef_ratio, vol_24h_usd FROM universe_snapshots
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM universe_snapshots)
          AND included = TRUE
        ORDER BY vol_24h_usd DESC`,
    );
  } catch {
    return [];
  }
}

interface DailySummary {
  trades24h: number;
  filled24h: number;
  errors24h: number;
}

async function loadSummary(): Promise<DailySummary> {
  const fallback = { trades24h: 0, filled24h: 0, errors24h: 0 };
  try {
    const [trades, filled, errors] = await Promise.all([
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM executions WHERE created_at > NOW() - INTERVAL '24 hours'`),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM executions WHERE filled_at > NOW() - INTERVAL '24 hours'`),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM execution_errors WHERE created_at > NOW() - INTERVAL '24 hours'`),
    ]);
    return {
      trades24h: Number(trades?.c ?? '0'),
      filled24h: Number(filled?.c ?? '0'),
      errors24h: Number(errors?.c ?? '0'),
    };
  } catch {
    return fallback;
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <Icon size={16} className="text-zinc-500" />
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function fmtNum(s: string | null, digits = 2): string {
  if (s === null || s === undefined) return '—';
  const n = Number(s);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

export default async function ExecutionsAdminPage(): Promise<React.ReactElement> {
  await requireAdmin();
  const [open, closed, errors, universe, summary] = await Promise.all([
    loadOpen(),
    loadRecentClosed(),
    loadRecentErrors(),
    loadTodayUniverse(),
    loadSummary(),
  ]);
  const mode = (process.env.EXECUTION_MODE ?? 'disabled').toLowerCase();
  const baseUrl = process.env.BINANCE_BASE_URL ?? '(unset)';

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white/5">
            <ArrowLeft size={14} className="inline -mt-0.5" /> Admin
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-emerald-400" /> Pilot Executions
          </h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          mode: <span className="font-mono text-emerald-400">{mode}</span> · base:{' '}
          <span className="font-mono text-zinc-300">{baseUrl}</span>
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Open" value={open.length} icon={Activity} />
          <StatCard label="Trades 24h" value={summary.trades24h} icon={TrendingUp} />
          <StatCard label="Filled 24h" value={summary.filled24h} icon={ShieldCheck} />
          <StatCard label="Errors 24h" value={summary.errors24h} icon={AlertTriangle} />
        </div>

        {/* Open positions */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Open Positions</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Stop</th>
                <th className="px-3 py-2 text-right">TP1</th>
                <th className="px-3 py-2 text-right">Lev</th>
                <th className="px-3 py-2 text-right">Risk $</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {open.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-4 text-center text-zinc-500">No open positions.</td>
                </tr>
              )}
              {open.map((r) => (
                <tr key={r.id} className="text-zinc-300">
                  <td className="px-3 py-2 font-mono">{r.symbol}</td>
                  <td className={`px-3 py-2 font-semibold ${r.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.side === 'BUY' ? <TrendingUp size={12} className="inline -mt-0.5" /> : <TrendingDown size={12} className="inline -mt-0.5" />}{' '}
                    {r.side}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(r.entry_price, 6)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(r.stop_price, 6)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(r.tp1_price, 6)}</td>
                  <td className="px-3 py-2 text-right">{r.leverage}x</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(r.risk_usd)}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{r.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Closed */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Closed (50)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">PnL $</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Closed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {closed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-zinc-500">No closed trades yet.</td>
                </tr>
              )}
              {closed.map((r) => {
                const pnl = r.realized_pnl ? Number(r.realized_pnl) : null;
                return (
                  <tr key={r.id} className="text-zinc-300">
                    <td className="px-3 py-2 font-mono">{r.symbol}</td>
                    <td className={`px-3 py-2 ${r.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{r.side}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtNum(r.entry_price, 6)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pnl !== null && pnl > 0 ? 'text-emerald-400' : pnl !== null && pnl < 0 ? 'text-rose-400' : ''}`}>
                      {pnl !== null ? pnl.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{r.closed_at ?? r.created_at}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Errors */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Recent Errors (30)</h2>
        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Signal</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {errors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-zinc-500">No errors logged.</td>
                </tr>
              )}
              {errors.map((e) => (
                <tr key={e.id} className="text-zinc-300">
                  <td className="px-3 py-2">{e.stage}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.error_code ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{e.error_msg.slice(0, 200)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.signal_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">{e.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Universe */}
        <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <Globe2 size={14} /> Today&apos;s Universe ({universe.length})
        </h2>
        <div className="rounded-xl border border-white/[0.06] p-4">
          {universe.length === 0 ? (
            <p className="text-sm text-zinc-500">Universe snapshot not yet generated.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {universe.map((u) => (
                <span
                  key={u.symbol}
                  className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-xs font-mono text-zinc-300"
                  title={`vol=$${(Number(u.vol_24h_usd) / 1e9).toFixed(2)}B  ER=${Number(u.ef_ratio).toFixed(3)}`}
                >
                  {u.symbol}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
