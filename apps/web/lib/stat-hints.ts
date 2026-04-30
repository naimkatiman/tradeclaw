/**
 * Centralised explainer copy for stat tooltips. Wherever a number's
 * denominator, math, or filter isn't self-evident, surface the matching
 * `<InfoHint text={STAT_HINTS.X} />` next to it. Keeping the strings here
 * means a phrasing tweak lands once and propagates to every surface.
 *
 * Conventions:
 * - Lead with the formula in plain words, then the row set it counts.
 * - When two surfaces show the "same" metric computed differently
 *   (linear-sum vs compounded), say which one this is.
 */
export const STAT_HINTS = {
  // ── Returns ──────────────────────────────────────────────────
  totalReturnLinear:
    'Linear sum of per-signal % returns at fixed 1R risk. Reads "if every signal risked the same fixed amount, the wins minus losses add up to this." Not the same as compounded equity growth.',
  totalReturnCompounded:
    'Compounded equity growth from a hypothetical $10,000 baseline, reinvesting 100% of bankroll into every next signal. Multiplicative — different from the linear total return shown elsewhere on this page.',
  avgPnl: 'Total return ÷ resolved signals. The average outcome of one trade in this window.',

  // ── Win-rate flavours ────────────────────────────────────────
  winRate24h:
    'Resolved signals where the 24h outcome hit TP, divided by total resolved signals in this window. Excludes auto-expired and gate-blocked rows.',
  winRate4h:
    'Resolved signals where the 4h outcome hit TP, divided by total resolved signals. Shorter horizon — an early read on signal quality.',
  hitRate:
    'Trades that hit TP within the window, divided by trades that resolved either way (TP or SL). Pending and gate-blocked rows excluded.',

  // ── Counts ───────────────────────────────────────────────────
  resolved:
    'Signals with a real 24h outcome (TP or SL hit). Excludes still-open trades, auto-expired rows, and gate-blocked signals.',
  expired:
    'Signal had no TP or SL hit within the 48h tracking window. Recorded for transparency, not counted in win-rate.',
  gateBlocked:
    'Engine emitted the signal but the full-risk gate refused entry (e.g. spread too wide, news lockout). Not counted toward equity.',
  pending: 'Signal is still inside the 24h tracking window. Outcome not yet known.',

  // ── Path & risk ──────────────────────────────────────────────
  maxDrawdown:
    'Worst peak-to-trough drop in the equity curve over this window. Even a positive endpoint can hide a deep mid-run drawdown — this surfaces the path, not just the destination.',
  sharpe:
    'Annualised Sharpe ratio: mean return ÷ stddev × √(signals per year). Cadence-aware — uses actual signal frequency, not the 252-trading-day shortcut.',
  streak: 'Consecutive resolved trades, signed: positive when on a win streak, negative on a losing streak.',
  bestStreak: 'Longest run of consecutive wins for this row. Counts only resolved trades.',
  worstStreak: 'Longest run of consecutive losses for this row. Counts only resolved trades.',

  // ── Confidence / model ───────────────────────────────────────
  avgConfidence:
    'Mean model confidence across signals in this window. Confidence is the engine\'s own self-assessed probability, not a calibrated forecast — see the calibration page for how it tracks reality.',
  premiumThreshold:
    'Premium tier: signals at or above the high-confidence threshold (currently 80%). Standard tier: everything below. The split is set in tier.ts.',

  // ── Backtest-specific ────────────────────────────────────────
  backtestTotalReturn:
    'Total return over the simulated period, computed exactly the same way as the live equity curve so backtest vs live numbers are directly comparable.',
  backtestProfitFactor:
    'Sum of winning trades ÷ absolute sum of losing trades. >1 means net profitable; >1.5 is decent; >2 is rare and usually a sign of overfitting.',
  backtestSharpe:
    'Annualised Sharpe over the backtest window. Same formula as the live Sharpe so they\'re comparable. Positive doesn\'t mean profitable in live trading — see slippage caveats.',
  backtestExpectancy:
    'Expected return per trade: (win rate × avg win) − (loss rate × avg loss). Positive expectancy is the only thing that matters long-run; win rate alone is misleading.',
} as const;

export type StatHintKey = keyof typeof STAT_HINTS;
