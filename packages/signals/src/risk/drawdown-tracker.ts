/**
 * Drawdown Tracker
 *
 * Maintains an in-memory equity curve, calculates high water mark,
 * drawdown percentages, daily/weekly PnL, and consecutive loss streaks.
 */

import type { EquityPoint, TradeOutcome } from './types.js';

const MAX_EQUITY_POINTS = 1000;

export class DrawdownTracker {
  private equityCurve: EquityPoint[] = [];
  private hwm = 0;
  private losses = 0;

  // ─── Equity Tracking ──────────────────────────────────────────

  recordEquity(equity: number): void {
    if (equity > this.hwm) {
      this.hwm = equity;
    }

    const drawdownPct =
      this.hwm > 0 ? ((this.hwm - equity) / this.hwm) * 100 : 0;

    this.equityCurve.push({
      equity,
      timestamp: new Date().toISOString(),
      drawdownPct,
    });

    // Keep bounded
    if (this.equityCurve.length > MAX_EQUITY_POINTS) {
      this.equityCurve = this.equityCurve.slice(-MAX_EQUITY_POINTS);
    }
  }

  // ─── Trade Outcome Tracking ──────────────────────────────────

  recordTradeOutcome(outcome: TradeOutcome): void {
    if (outcome.outcome === 'loss') {
      this.losses += 1;
    } else if (outcome.outcome === 'win') {
      this.losses = 0;
    }
    // breakeven does not reset or increment
  }

  // ─── Accessors ────────────────────────────────────────────────

  getDailyPnlPct(): number {
    return this.getPnlPctSince(startOfDay());
  }

  getWeeklyPnlPct(): number {
    return this.getPnlPctSince(startOfWeek());
  }

  getCurrentDrawdownPct(): number {
    const last = this.lastPoint();
    return last ? last.drawdownPct : 0;
  }

  getHighWaterMark(): number {
    return this.hwm;
  }

  getConsecutiveLosses(): number {
    return this.losses;
  }

  getEquityCurve(limit?: number): EquityPoint[] {
    if (limit === undefined) return [...this.equityCurve];
    return this.equityCurve.slice(-limit);
  }

  // ─── Internals ────────────────────────────────────────────────

  private lastPoint(): EquityPoint | undefined {
    return this.equityCurve[this.equityCurve.length - 1];
  }

  private getPnlPctSince(since: Date): number {
    const sinceMs = since.getTime();

    // Find the first point at or after `since`
    let baseEquity: number | undefined;
    for (const pt of this.equityCurve) {
      const ptMs = new Date(pt.timestamp).getTime();
      if (ptMs >= sinceMs) {
        baseEquity = pt.equity;
        break;
      }
    }

    // Fall back to the last point before `since` if none found after
    if (baseEquity === undefined) {
      for (let i = this.equityCurve.length - 1; i >= 0; i--) {
        const ptMs = new Date(this.equityCurve[i].timestamp).getTime();
        if (ptMs < sinceMs) {
          baseEquity = this.equityCurve[i].equity;
          break;
        }
      }
    }

    if (baseEquity === undefined || baseEquity === 0) return 0;

    const last = this.lastPoint();
    if (!last) return 0;

    return ((last.equity - baseEquity) / baseEquity) * 100;
  }
}

// ─── Date Helpers ──────────────────────────────────────────────────

function startOfDay(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // Monday = start of week
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
