# tradeclaw-agent OpenClaw Skill

OpenClaw wrapper for the standalone TradeClaw research agent.

## Current Availability

The standalone scanner is intentionally unavailable until an observed OHLCV
provider is implemented. `scan()` returns that explicit state; it does not
generate candles from current quotes. `prices()` can still show current values
actually received from configured public providers. `history()` includes only
rows explicitly marked as real.

## Commands

| Command | Behavior |
| --- | --- |
| "scan signals" | Report the OHLCV availability gate |
| "show prices" | Display provider-observed current prices |
| "signal history" | Display observed candidate outcome history |

Research software only. No broker order, fill, portfolio return, or investment
advice is represented by this skill.
