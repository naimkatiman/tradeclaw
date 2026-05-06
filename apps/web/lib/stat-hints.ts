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
    'Sum of per-signal % outcomes (raw market price-to-price). Reads "if every signal printed at exact entry/exit, this is what the trades summed to." Not a sized return — see the equity card below for the position-sized version.',
  totalReturnCompounded:
    'Compounded equity from $10,000 with 1% risk per trade (fixed-fractional sizing) and 0.05% round-trip costs deducted. This is what a subscriber executing every signal at fixed 1% risk would have earned, not the unbounded "100% bankroll per signal" curve. Differs from the raw price-to-price sum at the top of the page.',
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
    'Daily-bucketed annualized Sharpe: trades grouped by UTC date, then mean(daily %) ÷ stddev(daily %) × √365. Calendar days (not trading days) because the engine fires across crypto/FX/indices with no shared session. Daily bucketing is required because per-signal returns are not IID — same symbol re-fires and multi-timeframe stacks share macro factors.',
  streak: 'Consecutive resolved trades, signed: positive when on a win streak, negative on a losing streak.',
  bestStreak: 'Longest run of consecutive wins for this row. Counts only resolved trades.',
  worstStreak: 'Longest run of consecutive losses for this row. Counts only resolved trades.',

  // ── Confidence / model ───────────────────────────────────────
  avgConfidence:
    'Mean model confidence across signals in this window. Confidence is the engine\'s own self-assessed probability, not a calibrated forecast — see the calibration page for how it tracks reality.',
  premiumThreshold:
    'Premium tier: signals at or above the high-confidence threshold (currently 80%). Standard tier: everything below. The split is set in tier.ts.',

  // ── R-multiples & expectancy (live) ──────────────────────────
  avgRWin:
    'Average R-multiple of winning trades. R = entry-to-stop distance in pct; a +2.0R win realizes 2× the risked amount. Higher is better — a 40% win rate at 2R wins is more profitable than 60% at 1R.',
  avgRLoss:
    'Average R-multiple of losing trades. Should sit near -1.0R when stops fill cleanly. Values closer to 0 indicate slippage in your favor; further from 0 indicates gap losses worse than -1R.',
  expectancyR:
    'Expected R per trade: winRate × avgRWin + lossRate × avgRLoss. Positive expectancy is the only thing that matters long-run — win rate alone is misleading. +0.10R means each signal is worth about 10% of the risked amount on average.',
  breakEvenWinRate:
    'Win-rate the system needs to break even given its observed avgRWin and avgRLoss. If actual win-rate exceeds this, the system has positive expectancy — even if the win-rate is below 50%.',

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
