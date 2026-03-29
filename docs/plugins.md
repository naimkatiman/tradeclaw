# TradeClaw Plugin System

TradeClaw supports custom trading indicator plugins. Each plugin receives OHLCV candle data and returns a directional signal (`BUY`, `SELL`, or `HOLD`) with a confidence score.

## Plugin Interface

Every plugin must satisfy the `IndicatorPlugin` interface exported from `@tradeclaw/core`:

```typescript
import type { IndicatorPlugin, OHLCV, IndicatorResult } from '@tradeclaw/core';
```

### OHLCV

Standard candle data passed to every plugin:

| Field       | Type     | Description                        |
|-------------|----------|------------------------------------|
| `open`      | `number` | Opening price                      |
| `high`      | `number` | Highest price in the period        |
| `low`       | `number` | Lowest price in the period         |
| `close`     | `number` | Closing price                      |
| `volume`    | `number` | Trade volume                       |
| `timestamp` | `number` | Unix timestamp (ms) for the candle |

### IndicatorResult

The object your `compute` function must return:

| Field        | Type                          | Description                          |
|--------------|-------------------------------|--------------------------------------|
| `signal`     | `'BUY' \| 'SELL' \| 'HOLD'`  | Directional signal                   |
| `confidence` | `number`                      | Confidence from 0 to 100            |
| `meta`       | `Record<string, unknown>`     | Optional metadata (indicator values) |

### IndicatorPlugin

| Field     | Type                                  | Description                           |
|-----------|---------------------------------------|---------------------------------------|
| `name`    | `string`                              | Unique plugin name                    |
| `version` | `string`                              | Semver version                        |
| `compute` | `(candles: OHLCV[]) => IndicatorResult` | The computation function            |

## Writing a Plugin

Create a TypeScript file that default-exports an `IndicatorPlugin` object:

```typescript
// plugins/examples/my-indicator.ts
import type { IndicatorPlugin, OHLCV, IndicatorResult } from '@tradeclaw/core';

const myPlugin: IndicatorPlugin = {
  name: 'my-indicator',
  version: '1.0.0',
  compute(candles: OHLCV[]): IndicatorResult {
    const lastClose = candles[candles.length - 1]?.close ?? 0;
    const prevClose = candles[candles.length - 2]?.close ?? lastClose;

    if (lastClose > prevClose) {
      return { signal: 'BUY', confidence: 60, meta: { diff: lastClose - prevClose } };
    } else if (lastClose < prevClose) {
      return { signal: 'SELL', confidence: 60, meta: { diff: lastClose - prevClose } };
    }

    return { signal: 'HOLD', confidence: 30 };
  },
};

export default myPlugin;
```

## Installing / Loading Plugins

### Manual Registration

```typescript
import { pluginRegistry } from '@tradeclaw/core';
import myPlugin from './plugins/my-indicator';

pluginRegistry.register(myPlugin);
```

### Load from a Directory

The registry can scan a directory and auto-register every `.ts` / `.js` file that exports a valid plugin:

```typescript
import { pluginRegistry } from '@tradeclaw/core';

await pluginRegistry.loadFromDirectory('./plugins/examples');
```

## Running Plugins

Once plugins are registered, run them all against candle data:

```typescript
import { pluginRegistry } from '@tradeclaw/core';

const candles = await fetchCandles('BTCUSD', '1h', 100);
const { results, consensus, averageConfidence } = pluginRegistry.runAll(candles);

console.log(`Consensus: ${consensus} (${averageConfidence}% confidence)`);

for (const [name, result] of Object.entries(results)) {
  console.log(`  ${name}: ${result.signal} @ ${result.confidence}%`);
}
```

## Built-in Example: Williams %R

See `plugins/examples/williams-r.ts` for a complete example. It computes the Williams %R oscillator over 14 periods and produces:

- **BUY** when Williams %R < -80 (oversold)
- **SELL** when Williams %R > -20 (overbought)
- **HOLD** otherwise

## Plugin Best Practices

1. **Guard against insufficient data** — return `HOLD` with `confidence: 0` if there are not enough candles.
2. **Include indicator values in `meta`** — this helps with debugging and logging.
3. **Keep `compute` synchronous and pure** — no network calls or side effects.
4. **Use meaningful confidence scores** — stronger signals should produce higher confidence.
5. **Version your plugin** — bump the version when the algorithm changes.
