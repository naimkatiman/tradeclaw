# TradeClaw GitHub Action

Fetch live AI trading signals from [TradeClaw](https://tradeclaw.win) in your GitHub Actions workflows.

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-TradeClaw%20Signal-green?logo=github)](https://github.com/marketplace/actions/tradeclaw-signal)

## Usage

```yaml
- name: Get BTC signal
  uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  id: signal
  with:
    pair: BTCUSD
    timeframe: H1

- name: Print result
  run: |
    echo "Signal: ${{ steps.signal.outputs.signal }}"
    echo "Confidence: ${{ steps.signal.outputs.confidence }}%"
    echo "RSI: ${{ steps.signal.outputs.rsi }}"
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `pair` | Trading pair (e.g. BTCUSD, ETHUSD, XAUUSD) | `BTCUSD` |
| `timeframe` | Signal timeframe (M5, M15, H1, H4, D1) | `H1` |
| `base_url` | TradeClaw instance URL | `https://tradeclaw.win` |
| `fail_on_signal` | Fail if signal matches (e.g. `SELL`). `none` = never fail | `none` |
| `signal_direction` | Only pass if signal matches direction (BUY/SELL) | _(any)_ |
| `min_confidence` | Minimum confidence % threshold | `0` |

## Outputs

| Output | Description |
|--------|-------------|
| `signal` | Signal direction (BUY, SELL, or NEUTRAL) |
| `confidence` | Signal confidence (0-100) |
| `pair` | Queried trading pair |
| `timeframe` | Queried timeframe |
| `rsi` | Current RSI value |
| `direction` | Alias for `signal` |

## Examples

### Gate deployment on signal confidence

```yaml
- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with:
    pair: BTCUSD
    min_confidence: 70

- name: Deploy if confident
  if: success()
  run: npm run deploy
```

### Block deploy on SELL signal

```yaml
- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with:
    pair: ETHUSD
    fail_on_signal: SELL
```

### Multi-pair matrix

```yaml
strategy:
  matrix:
    pair: [BTCUSD, ETHUSD, XAUUSD]
steps:
  - uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
    with:
      pair: ${{ matrix.pair }}
```

### Self-hosted instance

```yaml
- uses: naimkatiman/tradeclaw/packages/tradeclaw-action@main
  with:
    pair: BTCUSD
    base_url: http://localhost:3000
```

## Step Summary

The action automatically writes a rich summary to `GITHUB_STEP_SUMMARY` with the signal, confidence, and RSI — visible in the Actions run UI.

## License

MIT
