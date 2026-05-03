export interface ClosedTradeLike { pnlPct: number; closedAt: number }

export function currentWinStreak(trades: ClosedTradeLike[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].sort((a, b) => b.closedAt - a.closedAt);
  let streak = 0;
  for (const t of sorted) {
    if (t.pnlPct > 0) streak++;
    else break;
  }
  return streak;
}
