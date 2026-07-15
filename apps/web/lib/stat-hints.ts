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
    'Arithmetic sum of each counted signal\'s OHLCV-resolved price move. It assumes the displayed entry and resolved exit for every signal, with no position sizing or execution costs. This is not a portfolio return; see the equity card for the separate sequential simulation.',
  totalReturnCompounded:
    "Hypothetical sequential equity simulation starting at $10,000. It orders eligible sized signals by timestamp, risks 1% of current equity on every signal, caps each R-multiple at 8R, and deducts static per-asset fee/slippage assumptions (~0.40% crypto, ~0.10% metals, ~0.04% FX of notional). It does not use broker fills or model overlapping exposure, margin, leverage, latency, funding, or subscriber selection, so it is not an actual portfolio return.",
  avgPnl: 'Arithmetic sum of OHLCV-resolved per-signal price moves ÷ counted resolved signals. No position sizing or execution costs are applied.',

  // ── Win-rate flavours ────────────────────────────────────────
  winRate24h:
    'Counted signals whose 24h OHLCV outcome hit TP, divided by counted signals with a usable 24h OHLCV outcome. A nonzero 24h close after neither TP nor SL hit counts as a miss. Excludes zero/missing force-expiry placeholders, simulated rows, and gate-blocked rows.',
  winRate4h:
    'Resolved signals where the 4h outcome hit TP, divided by total resolved signals. Shorter horizon — an early read on signal quality.',
  hitRate:
    'Counted signals that hit TP within the window, divided by counted signals with a usable OHLCV outcome. Nonzero horizon-close misses remain counted; pending, simulated, gate-blocked, and force-expiry placeholder rows are excluded.',

  // ── Counts ───────────────────────────────────────────────────
  resolved:
    'Signals with a usable 24h outcome resolved from provider OHLCV: TP, SL, or a nonzero 24h close after neither was hit. Excludes still-open rows, zero/missing force-expiry placeholders, simulated rows, and gate-blocked signals. This is an engine signal study, not a subscriber execution ledger.',
  expired:
    'The resolver could not produce a usable 24h market outcome and wrote a zero force-expiry placeholder, or the row remains missing after the horizon. Excluded from win rate. A nonzero 24h close is counted instead.',
  gateBlocked:
    'Engine emitted the signal but the full-risk gate refused entry (e.g. spread too wide, news lockout). Not counted toward equity.',
  pending: 'Signal is still inside the 24h tracking window. Outcome not yet known.',

  // ── Path & risk ──────────────────────────────────────────────
  maxDrawdown:
    'Worst peak-to-trough drop in the hypothetical sequential equity simulation over this window. It is model drawdown, not drawdown observed in a broker or subscriber account.',
  sharpe:
    'Daily-bucketed annualized Sharpe: trades grouped by UTC date, then mean(daily %) ÷ stddev(daily %) × √365. Calendar days (not trading days) because the engine fires across crypto/FX/indices with no shared session. Daily bucketing is required because per-signal returns are not IID — same symbol re-fires and multi-timeframe stacks share macro factors.',
  streak: 'Consecutive resolved trades, signed: positive when on a win streak, negative on a losing streak.',
  bestStreak: 'Longest run of consecutive wins for this row. Counts only resolved trades.',
  worstStreak: 'Longest run of consecutive losses for this row. Counts only resolved trades.',

  // ── Confidence / model ───────────────────────────────────────
  avgConfidence:
    'Mean mechanical rule/confluence score across signals in this window, on a 0–100 scale. It measures indicator agreement and is not a probability, calibrated forecast, or demonstrated trading edge.',
  premiumThreshold:
    'High-score band: signals with a mechanical rule/confluence score of at least 80/100. This threshold is a routing rule, not an estimated probability of success.',

  // ── R-multiples & expectancy (live) ──────────────────────────
  avgRWin:
    'Average R-multiple of winning OHLCV-resolved signals. R = entry-to-stop distance in percent; +2.0R means the modeled price outcome was twice the planned risk distance. This is not a broker fill or realized account gain.',
  avgRLoss:
    'Average R-multiple of losing OHLCV-resolved signals. Values near -1R mean the resolved price outcome was near the planned stop distance; they do not measure broker fill quality or realized slippage.',
  expectancyR:
    'Average modeled R per eligible sized signal after stated cost assumptions: gross expectancy − average modeled fee/slippage cost in R. A positive gross value with a negative net value means the assumed costs exceed the observed gross edge. This is study expectancy, not realized subscriber expectancy.',
  breakEvenWinRate:
    'Win rate the study needs to break even given its observed average win/loss R and stated cost assumptions. If the observed OHLCV-resolved win rate exceeds it, the study has positive modeled expectancy, even below 50%.',

  // ── Backtest-specific ────────────────────────────────────────
  backtestTotalReturn:
    'Modeled return over the backtest period. It can be compared with the public sequential simulation only when both use the same sizing, cost, and outcome assumptions; neither is an actual portfolio return.',
  backtestProfitFactor:
    'Sum of winning trades ÷ absolute sum of losing trades. >1 means net profitable; >1.5 is decent; >2 is rare and usually a sign of overfitting.',
  backtestSharpe:
    'Annualised Sharpe over the backtest window. Same formula as the live Sharpe so they\'re comparable. Positive doesn\'t mean profitable in live trading — see slippage caveats.',
  backtestExpectancy:
    'Expected return per trade: (win rate × avg win) − (loss rate × avg loss). Positive expectancy is the only thing that matters long-run; win rate alone is misleading.',
} as const;

export type StatHintKey = keyof typeof STAT_HINTS;
