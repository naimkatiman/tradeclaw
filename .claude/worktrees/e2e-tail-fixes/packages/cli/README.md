# tradeclaw-cli

CLI tool for headless TradeClaw signal fetching. Connects to any TradeClaw instance and displays trading signals, runs backtests, and supports continuous polling -- all from the terminal.

## Installation

```bash
npm install -g tradeclaw-cli
```

Or run locally from the monorepo:

```bash
cd packages/cli
npm install
npm run build
node dist/index.js --help
```

## Configuration

Before using the CLI, configure your TradeClaw instance URL and API key:

```bash
# Set the base URL of your TradeClaw instance
tradeclaw config set url http://localhost:3000

# Set your API key for authenticated requests
tradeclaw config set apikey your-api-key-here

# View current configuration
tradeclaw config get
```

Configuration is stored in `~/.tradeclaw/config.json`.

## Commands

### Fetch Signals

```bash
# Fetch all signals
tradeclaw signals

# Filter by symbol
tradeclaw signals --symbol BTCUSDT

# Filter by direction
tradeclaw signals --filter BUY

# Output raw JSON
tradeclaw signals --json

# Combine filters
tradeclaw signals --symbol BTCUSDT --filter BUY --json
```

### Run Backtest

```bash
# Backtest EURUSD over the last 30 days
tradeclaw backtest --symbol EURUSD --days 30

# JSON output
tradeclaw backtest --symbol EURUSD --days 90 --json
```

### Watch Mode

Poll signals at a regular interval:

```bash
# Watch BTCUSDT every 60 seconds (default)
tradeclaw watch --symbol BTCUSDT

# Custom interval (every 30 seconds)
tradeclaw watch --symbol BTCUSDT --interval 30

# JSON output for piping to other tools
tradeclaw watch --symbol BTCUSDT --json
```

## Output

The CLI uses colored terminal output by default:

- **BUY** signals are displayed in green
- **SELL** signals are displayed in red
- **HOLD** signals are displayed in yellow

Use `--json` on any command to get raw JSON output for scripting and piping.

## Development

```bash
# Run in dev mode (no build required)
npm run dev -- signals --symbol BTCUSDT

# Build TypeScript
npm run build
```

## License

MIT
