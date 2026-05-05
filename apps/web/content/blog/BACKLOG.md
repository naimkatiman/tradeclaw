# Blog backlog

Topics surfaced but not yet written. Add new candidates at the top.
The cadence agent (Sunday 9am SGT) is allowed to read this file when sourcing topics — drop ideas here as they come up.

`.md` files in this directory are ignored by the post loader (`apps/web/app/blog/posts.ts` only globs `*.mdx`), so this file is safe to keep alongside published content.

---

## ATR-Scaled Stops: Why Fixed-Pip Stops Are a Trap

- **Source signal.** `docs(plans): disposition for issue #53 (ATR-scaled stops)` — feature in flight.
- **Hook.** Fixed-pip stops are volatility-blind. A 30-pip stop on EUR/USD M5 ≠ 30 pips on M15 ≠ 30 pips on XAU.
- **Audience.** Forex/crypto traders whose stops keep getting tagged before the move.
- **Outline.**
  - The volatility-blindness problem with worked numeric example
  - ATR primer (Wilder's 14-period default)
  - `stop = entry ± k × ATR`, k = 1.5–2.5; trend vs mean-reversion choice
  - Why TradeClaw's existing 0.5% min-stop gate is a stopgap and ATR scaling is the next step (issue #53)
  - Backtest: fixed 30-pip vs 2× ATR on EUR/USD H1, 24 months — expectancy + drawdown comparison
  - Pitfall: ATR contraction during news creates false-tight stops; mitigation = ATR floor + time-of-day filter
  - Implementation snippet from `apps/web/app/lib/ta-engine.ts`
- **Keywords.** "ATR stop loss", "volatility scaled stops", "average true range trading"
- **Read time.** 9–10 min
- **Ties to.** Existing post `how-we-score-signals` (mentions the 0.5% min-stop gate)

---

## TradeClaw vs TradingView: When You'd Pick Each (Honestly)

- **Source signal.** Route `apps/web/app/vs-tradingview/page.tsx` exists with no blog post pointing to it. Comparison-keyword opportunity.
- **Hook.** Honest framing up front: TradingView is a charting platform, TradeClaw is a signal engine. They're not the same product.
- **Audience.** TradingView Pro subscribers evaluating alternatives; OSS-curious traders comparing tools; cost-conscious users hitting TV's tier walls.
- **Outline.**
  - Where TradingView wins — chart depth, mobile, broker integrations, social Pine community, breadth
  - Where TradeClaw wins — open source, self-hosted, deterministic + inspectable scoring, free unlimited API, transparent algorithm
  - 2-year cost table — TV Pro $360 / TradeClaw self-host $120 / TradeClaw Pro $580 annual
  - Use case 1 — discretionary chart analysis → TradingView
  - Use case 2 — systematic signals + reproducible backtests → TradeClaw
  - Use case 3 — API-driven personal bot → TradeClaw (TV API costs add ~$150/mo on top of Pro+)
  - The both-tools answer — Pine alerts as triggers feeding TradeClaw scoring as the filter
- **Keywords.** "TradeClaw vs TradingView", "TradingView alternative open source", "free TradingView Pro alternative"
- **Read time.** 10–11 min
- **High intent.** Comparison searches convert harder than educational searches.
