# tradeclaw-mcp

> Model Context Protocol (MCP) server for TradeClaw — fetch live AI trading signals in any MCP-compatible AI assistant

[![npm](https://img.shields.io/npm/v/tradeclaw-mcp.svg)](https://npmjs.com/package/tradeclaw-mcp)
[![GitHub Stars](https://img.shields.io/github/stars/naimkatiman/tradeclaw?style=flat)](https://github.com/naimkatiman/tradeclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Ask your AI assistant to fetch live trading signals from TradeClaw without writing any code.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tradeclaw": {
      "command": "npx",
      "args": ["tradeclaw-mcp"]
    }
  }
}
```

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Restart Claude Desktop, then ask:

> "What's the current BTC signal from TradeClaw?"

> "Show me all BUY signals with over 75% confidence"

> "Explain the XAUUSD H4 signal"

### Other MCP Clients (Cursor, Cline, Continue, etc.)

```bash
npx tradeclaw-mcp
```

### Self-Hosted TradeClaw

Point to your own instance:

```json
{
  "mcpServers": {
    "tradeclaw": {
      "command": "npx",
      "args": ["tradeclaw-mcp", "--base-url", "http://localhost:3000"]
    }
  }
}
```

Or via environment variable:

```bash
TRADECLAW_BASE_URL=http://localhost:3000 npx tradeclaw-mcp
```

## Available Tools

### `get_signals`
Fetch live BUY/SELL trading signals.

Parameters:
- `pair` — Trading pair (BTCUSD, ETHUSD, XAUUSD, EURUSD, GBPUSD, USDJPY, XAGUSD, GBPJPY, AUDUSD, USDCAD)
- `timeframe` — H1, H4, or D1
- `direction` — BUY or SELL
- `minConfidence` — Minimum confidence % (0-100)
- `limit` — Number of signals (max 50)

**Example prompts:**
- "Get the top 5 SELL signals with >80% confidence"
- "What are the current H4 signals for EURUSD?"
- "Show all BTCUSD signals"

### `get_leaderboard`
Get accuracy leaderboard by asset pair.

Parameters:
- `period` — 7d, 30d, or all
- `sort` — hitRate, totalSignals, or avgConfidence
- `limit` — Number of entries

**Example prompts:**
- "Which pairs have the best signal accuracy this month?"
- "Show the 30-day leaderboard sorted by win rate"

### `get_health`
Check TradeClaw platform status.

**Example prompt:**
- "Is TradeClaw running?"

### `explain_signal`
Get a detailed natural language explanation of a signal.

Parameters:
- `pair` — Trading pair
- `timeframe` — H1, H4, or D1

**Example prompts:**
- "Explain the current XAUUSD H1 signal"
- "Break down the BTCUSD daily signal for me"

## Example Conversations

**You:** What's the current gold signal?

**Claude (with TradeClaw MCP):**
> ## ▲ XAUUSD — BUY (82% confidence)
> - Timeframe: H1
> - Entry: 2648.30
> - Stop Loss: 2631.50 (risk: 0.63%)
> - Take Profit 1: 2674.80 | TP2: 2698.20
> - Risk:Reward: 1:2.4
> - RSI (38.2): approaching oversold (bullish)
> - MACD: above zero (bullish momentum)

## About TradeClaw

TradeClaw is an open-source, self-hostable AI trading signal platform. Generate BUY/SELL signals for forex, crypto, and commodities using RSI, MACD, EMA, Bollinger Bands, and more.

- 🌐 **Live Demo:** [tradeclaw.win](https://tradeclaw.win)
- 🐙 **GitHub:** [naimkatiman/tradeclaw](https://github.com/naimkatiman/tradeclaw)
- 📖 **Docs:** [tradeclaw.win/docs](https://tradeclaw.win/docs)
- 🔌 **REST API:** [tradeclaw.win/api-docs](https://tradeclaw.win/api-docs)
- 🐳 **Docker:** `docker compose up -d`

## License

MIT — © TradeClaw Contributors
