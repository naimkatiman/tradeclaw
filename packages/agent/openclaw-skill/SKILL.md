# tradeclaw-agent

Self-hosted wrapper for TradeClaw research candidates, provider-observed spot
prices, and observed outcome history.

Signal scanning currently fails closed because the standalone agent has no
observed OHLCV provider. It does not expand spot quotes into synthetic candles,
deliver generated candidates, or record them as history. Price commands return
only values received from providers and show unavailable when none respond.

## Usage

- "scan signals" -> report signal-data availability
- "show prices" -> display current provider observations
- "signal history" -> show explicitly real, persisted candidate outcomes
- "start signal agent" -> start the status daemon

## Requirements

- Node.js 18 or newer
- Internet access for provider price observations
- Optional Telegram, Discord, or webhook credentials for future observed data
