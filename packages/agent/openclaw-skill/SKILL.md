# tradeclaw-agent

Self-hosted AI trading signal agent. Scans forex, crypto, and metals markets using real technical indicators, delivers signals to Telegram, Discord, or any webhook.

## Install

```bash
clawhub install tradeclaw-agent
```

## Usage

- "scan signals" → run a full market scan and show results
- "show XAUUSD signals" → signals for a specific symbol
- "show prices" → display current live prices from all sources
- "start signal agent" → start the background daemon
- "set min confidence 80" → configure minimum confidence threshold
- "signal history" → show historical accuracy and stats
- "show signal stats" → breakdown by symbol and skill

## Requirements

- Node.js >= 18.0.0
- Internet connection (for live price feeds)
- Optional: Telegram bot token / Discord webhook for delivery
