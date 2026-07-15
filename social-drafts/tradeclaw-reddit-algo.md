# Reddit Draft - r/algotrading

## Title

Open-sourcing a rule-scored signal research stack with explicit outcome provenance

## Body

I am working on TradeClaw, a TypeScript/Next.js platform for generating rule-scored candidates and evaluating eligible rows against later OHLCV data.

The repository is here: https://github.com/naimkatiman/tradeclaw

The main design constraint is denominator integrity. Counted 24-hour results exclude simulated, gate-blocked, unresolved, and force-expired placeholder rows. Each public metric should carry its sample, window, source, and methodology.

This is not execution evidence. OHLCV-resolved outcomes are not broker fills and do not necessarily include spread, fees, slippage, funding, rejected orders, sizing, or portfolio equity. A rule score is also not a calibrated probability of profit.

I am looking for technical feedback on outcome resolution, cost modeling, calibration, and provenance. The code is MIT licensed; operating infrastructure and external providers may still cost money.
