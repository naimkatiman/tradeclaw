# TradeClaw GitHub Action

Fetch live AI trading signals from [TradeClaw](https://tradeclaw.win) in your GitHub Actions workflows.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TradeClaw%20Signal-green?logo=github)](https://github.com/marketplace/actions/tradeclaw-signal-check)

## Quick Start

```yaml
- name: Check BTC signal
  uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1

- name: Use the result
  run: |
    echo "Found: ${{ steps.signal.outputs.signal_found }}"
    echo "Direction: ${{ steps.signal.outputs.signal_direction }}"
    echo "Confidence: ${{ steps.signal.outputs.signal_confidence }}%"
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `pair` | Trading pair (e.g. BTCUSD, ETHUSD, XAUUSD) | `BTCUSD` |
| `timeframe` | Signal timeframe (H1, H4, D1) | `H1` |
| `direction` | Filter by direction (BUY, SELL, ALL) | `ALL` |
| `min_confidence` | Minimum confidence threshold (0-100) | `70` |
| `base_url` | TradeClaw instance URL | `https://tradeclaw.win` |

## Outputs

| Output | Description |
|--------|-------------|
| `signal_found` | Whether a matching signal was found (`true`/`false`) |
| `signal_direction` | Signal direction (BUY or SELL) |
| `signal_confidence` | Signal confidence percentage (0-100) |
| `signal_json` | Full signal JSON payload |

## Use Cases

### 1. Alert on BTC sell signal

```yaml
name: BTC Sell Alert
on:
  schedule:
    - cron: '0 */4 * * *'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: BTCUSD
          direction: SELL
          min_confidence: 80

      - name: Send Slack alert
        if: steps.signal.outputs.signal_found == 'true'
        run: |
          curl -X POST "$SLACK_WEBHOOK" -d "{
            \"text\": \"BTC SELL signal @ ${{ steps.signal.outputs.signal_confidence }}% confidence\"
          }"
```

### 2. CI gate on direction

```yaml
name: Deploy Gate
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: BTCUSD
          direction: BUY
          min_confidence: 70

      - name: Deploy if bullish
        if: steps.signal.outputs.signal_found == 'true'
        run: npm run deploy
```

### 3. Paper trade trigger

```yaml
name: Paper Trade
on:
  schedule:
    - cron: '0 * * * *'

jobs:
  trade:
    runs-on: ubuntu-latest
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: ETHUSD
          timeframe: H4
          min_confidence: 75

      - name: Execute paper trade
        if: steps.signal.outputs.signal_found == 'true'
        run: |
          echo "Paper trading ${{ steps.signal.outputs.signal_direction }} ETH"
          echo "${{ steps.signal.outputs.signal_json }}" >> trades.log
```

### 4. Daily signal report in job summary

```yaml
name: Daily Signal Report
on:
  schedule:
    - cron: '0 8 * * *'

jobs:
  report:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        pair: [BTCUSD, ETHUSD, XAUUSD]
    steps:
      - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
        id: signal
        with:
          pair: ${{ matrix.pair }}
          timeframe: D1

      - name: Write summary
        run: |
          echo "### ${{ matrix.pair }}" >> $GITHUB_STEP_SUMMARY
          echo "- Direction: ${{ steps.signal.outputs.signal_direction }}" >> $GITHUB_STEP_SUMMARY
          echo "- Confidence: ${{ steps.signal.outputs.signal_confidence }}%" >> $GITHUB_STEP_SUMMARY
          echo "- Found: ${{ steps.signal.outputs.signal_found }}" >> $GITHUB_STEP_SUMMARY
```

## Self-Hosted Instance

```yaml
- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with:
    pair: BTCUSD
    base_url: http://localhost:3000
```

## How It Works

This is a **composite action** that uses `curl` and `python3` (both pre-installed on GitHub runners) to fetch signals from the TradeClaw API. No Node.js build step, no dependencies.

## License

MIT
