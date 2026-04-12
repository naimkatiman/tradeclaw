'use client';

import type { BacktestResult } from '@tradeclaw/strategies';

interface MetricsTableProps {
  results: BacktestResult[];
  presetNames: Record<string, string>;
}

export function MetricsTable({ results, presetNames }: MetricsTableProps) {
  if (results.length === 0) return null;

  const columns = [
    { key: 'totalReturn' as const, label: 'Total Return', format: pct, best: 'max' as const },
    { key: 'winRate' as const, label: 'Win Rate', format: pct, best: 'max' as const },
    { key: 'profitFactor' as const, label: 'Profit Factor', format: num, best: 'max' as const },
    { key: 'maxDrawdown' as const, label: 'Max Drawdown', format: pct, best: 'min' as const },
    { key: 'sharpeRatio' as const, label: 'Sharpe', format: num, best: 'max' as const },
    { key: 'totalTrades' as const, label: 'Trades', format: (n: number) => String(n), best: 'none' as const },
  ];

  const bestByColumn = new Map<string, number>();
  for (const col of columns) {
    if (col.best === 'none') continue;
    const values = results.map((r) => r[col.key] as number).filter((v) => Number.isFinite(v));
    if (values.length === 0) continue;
    const best = col.best === 'max' ? Math.max(...values) : Math.min(...values);
    bestByColumn.set(col.key, best);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-zinc-200">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-2">Preset</th>
            {columns.map((c) => (
              <th key={c.key} className="text-right p-2">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.strategyId} className="border-b border-white/5">
              <td className="p-2 font-medium">{presetNames[r.strategyId] ?? r.strategyId}</td>
              {columns.map((c) => {
                const v = r[c.key] as number;
                const isBest = bestByColumn.get(c.key) === v && c.best !== 'none';
                return (
                  <td
                    key={c.key}
                    className={`p-2 text-right ${isBest ? 'text-emerald-400 font-semibold' : ''}`}
                  >
                    {c.format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return (n * 100).toFixed(2) + '%';
}

function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return n.toFixed(2);
}
