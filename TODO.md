# TradeClaw — Task Status
_Updated: 2026-04-03 02:17 MYT_

## Completed ✅

- [x] **Candle-close filter** — Scanner v5 checks candle status per TF, only emits near boundaries
- [x] **Historical win rate per symbol/direction** — `win_rate` field in signal output, sourced from signals.db
- [x] **Binance API cross-validation** — Secondary price confirmation, confidence bonus when both agree
- [x] **SSE live price endpoint** — `/api/prices/stream` streaming Binance/forex prices to frontend
- [x] **Enhanced confidence scoring** — win_rate weighted + cross-validation bonus applied
- [x] **Build & verify** — `npm run build` passes clean ✅

## Next Sprint (TBD)
- [ ] Outcome tracker — auto-check if past signals hit TP or SL, update signals.db
- [ ] Win rate display on frontend signal cards
- [ ] Alert user on Telegram when 4-TF confluence signal fires
