# TradeClaw Discord Bot

Discord bot that posts live trading signals to your server with slash commands and auto-broadcast.

## Quick Start

```bash
# 1. Install dependencies
cd packages/tradeclaw-discord
npm install

# 2. Set your bot token
export DISCORD_TOKEN=your_bot_token_here

# 3. Run
npm start
```

## Invite the Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a New Application → Bot → copy the token
3. Use this invite URL (replace `YOUR_CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=2048
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/signal [pair]` | Get latest signal for a pair (random if omitted) |
| `/leaderboard [period]` | Top 5 pairs by win rate (24h, 7d, 30d, all) |
| `/health` | API health + uptime |
| `/subscribe [pair] [min_confidence]` | Auto-receive signals in this channel |
| `/unsubscribe` | Stop signal broadcasts |
| `/help` | List all commands |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | Yes | — | Bot token from Discord Developer Portal |
| `TRADECLAW_BASE_URL` | No | `https://tradeclaw.win` | TradeClaw API base URL |
| `BROADCAST_INTERVAL` | No | `30` | Minutes between auto-broadcasts |

## Docker

```yaml
# Add to your docker-compose.yml
tradeclaw-discord:
  build: ./packages/tradeclaw-discord
  environment:
    - DISCORD_TOKEN=${DISCORD_TOKEN}
    - TRADECLAW_BASE_URL=http://web:3000
  restart: unless-stopped
```

## Signal Embed Preview

```
🟢 BUY Signal — BTCUSD H1
━━━━━━━━━━━━━━━━━━
💰 Price: $43,250.00
🎯 TP: $44,100 | 🛡️ SL: $42,800
📊 Confidence: 87%
📈 RSI: 42.3 | MACD: ▲
⏰ Just now
```

## License

MIT — part of the [TradeClaw](https://github.com/naimkatiman/tradeclaw) project.
