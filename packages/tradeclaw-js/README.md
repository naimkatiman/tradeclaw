# tradeclaw

JavaScript/TypeScript SDK for [TradeClaw](https://github.com/naimkatiman/tradeclaw) — open-source AI trading signal platform.

[![npm version](https://img.shields.io/npm/v/tradeclaw)](https://www.npmjs.com/package/tradeclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Install

```bash
npm install tradeclaw-js
```

## Usage

```typescript
import { TradeclawClient } from 'tradeclaw-js';

const client = new TradeclawClient({
  // defaults to https://tradeclaw.win — or point to your self-hosted instance
  baseUrl: 'https://tradeclaw.win',
});

// Fetch live signals
const signals = await client.signals({ pair: 'BTCUSD', limit: 5 });
console.log(signals);
// [{ pair: 'BTCUSD', direction: 'BUY', confidence: 87, timeframe: 'H1', ... }]

// Fetch leaderboard
const board = await client.leaderboard({ period: '30d', sort: 'hitRate' });
console.log(board[0]);
// { pair: 'XAUUSD', hitRate: 0.74, totalSignals: 42, ... }

// Health check
const health = await client.health();
console.log(health.status); // 'ok'
```

## Self-hosted

Point at your own TradeClaw instance:

```typescript
const client = new TradeclawClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'tc_your_api_key',
});
```

## API

### `client.signals(filter?)`

| Param | Type | Description |
|-------|------|-------------|
| `pair` | string | Filter by pair (BTCUSD, XAUUSD, etc.) |
| `direction` | `BUY` \| `SELL` | Filter by direction |
| `timeframe` | `M5`\|`M15`\|`H1`\|`H4`\|`D1` | Filter by timeframe |
| `limit` | number | Max results (default: 20) |
| `minConfidence` | number | Minimum confidence 0-100 |

### `client.leaderboard(filter?)`

| Param | Type | Description |
|-------|------|-------------|
| `period` | `7d`\|`30d`\|`all` | Lookback period |
| `sort` | `hitRate`\|`totalSignals`\|`avgConfidence` | Sort field |

### `client.health()`

Returns server status, version, uptime.

### `client.badge(pair)`

Returns shields.io-compatible JSON badge for embedding in READMEs.

## Links

- [TradeClaw GitHub](https://github.com/naimkatiman/tradeclaw)
- [Live Demo](https://tradeclaw.win/demo)
- [API Docs](https://tradeclaw.win/api-docs)

## License

MIT
