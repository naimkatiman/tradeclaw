# TradeClaw Discord Bot

Discord client for provider-observed TradeClaw research candidates and resolved
directional-outcome summaries.

The bot fails closed. API errors, incomplete rows, fallback rows, and synthetic
rows produce an explicit unavailable response. They are never replaced with
generated prices, candidates, win rates, or P&L, and unavailable rows are never
auto-broadcast.

## Quick Start

```bash
cd packages/tradeclaw-discord
npm install
export DISCORD_BOT_TOKEN=your_bot_token_here
npm start
```

Create the application and token in the
[Discord Developer Portal](https://discord.com/developers/applications). A bot
invite uses this pattern, replacing `YOUR_CLIENT_ID`:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=2048
```

## Commands

| Command | Description |
| --- | --- |
| `/signal [pair]` | Latest complete provider-observed research candidate |
| `/leaderboard [period]` | Resolved 24h directional outcomes; not trades or portfolio P&L |
| `/health` | API process and data-availability status |
| `/subscribe [pair] [min_confidence]` | Broadcast qualifying observed candidates |
| `/unsubscribe` | Stop candidate broadcasts |
| `/help` | List commands |

The API's legacy `confidence` field is shown as a mechanical rule score out of
100. It is not represented as a calibrated forecast probability.

## Environment

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_BOT_TOKEN` | Yes | None | Discord bot token |
| `DISCORD_CLIENT_ID` | No | None | Application client ID |
| `TRADECLAW_BASE_URL` | No | `https://tradeclaw.win` | TradeClaw API base URL |
| `BROADCAST_INTERVAL` | No | `5` | Polling interval in minutes |

## License

MIT. Research software only; no broker order, fill, portfolio return, or
investment advice is represented by this package.
