# TradeClaw — Next Tasks
_Updated: 2026-04-03_

## Pending (in order)

- [ ] **Candle-close filter** — Only emit signals near candle boundaries (M15 close, H1 close). Reduces mid-candle noise.
- [ ] **Historical win rate per symbol/direction** — Pull from signals.db, inject into signal output as `win_rate` field. Basis for trust score.
- [ ] **Binance API cross-validation** — Secondary source alongside TV screener. If both agree → confidence bonus. If they diverge → confidence penalty.
- [ ] **SSE live price endpoint** — `/api/sse/prices` streaming Binance/forex prices to frontend in real-time.
- [ ] **Enhanced confidence scoring** — Weight confidence by historical win rate + cross-validation bonus. Formula: `final_confidence = base_confluence + win_rate_bonus + cross_validation_bonus`.
- [ ] **Build & verify** — `npm run build` must pass. All modules compile clean.

## Rules for this sprint
- Research → Plan → Execute → Review → Iterate
- One task at a time, verified before next
- Write files first, exec second
- No feature additions — only these 6 tasks
