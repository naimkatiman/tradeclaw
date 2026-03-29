# tradeclaw-agent — OpenClaw Skill

Use tradeclaw-agent as an [OpenClaw](https://github.com/openclaw/openclaw) skill to get trading signals delivered to any connected channel (Telegram, Discord, etc).

## Install

```bash
clawhub install tradeclaw-agent
```

## Usage

Once installed, just talk to your OpenClaw agent:

| Command | What it does |
|---------|-------------|
| "scan signals" | Run a full market scan |
| "show XAUUSD signals" | Signals for a specific symbol |
| "show prices" | Display live prices |
| "signal history" | Historical accuracy stats |
| "set min confidence 80" | Change confidence threshold |
| "start signal agent" | Start the background daemon |

## How It Works

The skill wraps the tradeclaw-agent Node.js API:

1. **`scan()`** — Fetches live prices → runs technical indicators → returns formatted signals
2. **`prices()`** — Shows real-time prices from CoinGecko, metals.live, and ExchangeRate API
3. **`history()`** — Reads `~/.tradeclaw/signal-history.jsonl` and computes accuracy stats
4. **`symbols()`** — Lists all supported trading pairs

## Requirements

- Node.js >= 18.0.0
- `tradeclaw-agent` installed globally or as a dependency
- Internet connection for live price feeds

## Manual Setup (without clawhub)

```bash
# Install tradeclaw-agent globally
npm install -g tradeclaw-agent

# Copy the skill to your OpenClaw skills directory
cp -r ./openclaw-skill ~/.openclaw/skills/tradeclaw-agent
```
