# I built an open-source AI trading signal platform — here's what I learned

*Cross-post this to Dev.to, Hashnode, and Medium for maximum reach.*

---

**Tags:** `opensource` `trading` `nextjs` `typescript` `selfhosted`

**Cover image:** Use `apps/web/public/readme-banner.svg` or a screenshot of the dashboard

---

## The problem

Every time I wanted to trade forex or crypto, I had the same friction: open TradingView, look at RSI, look at MACD, look at EMA, try to decide if they agree, second-guess myself.

The tools exist. The data exists. The math is solved. But nobody had packaged it as "here's the decision, not just the numbers."

So I built [TradeClaw](https://github.com/naimkatiman/tradeclaw).

## What it does

TradeClaw is a self-hosted AI trading signal platform. Point it at a symbol, and it returns:

```json
{
  "direction": "BUY",
  "confidence": 82,
  "entry": 94210.50,
  "stopLoss": 93580.00,
  "takeProfit1": 95420.00,
  "takeProfit2": 96800.00
}
```

Not RSI=68. Not "MACD is crossing above signal line." A decision.

It covers 10 assets across forex, crypto, and commodities. It runs entirely in Docker. It has a REST API, a Telegram bot, a paper trading simulator, and a backtest visualizer.

It's MIT-licensed. Free forever. You own your data.

## The tech stack

- **Next.js 14** — app router, server components
- **TypeScript** — strict mode throughout  
- **No database** — file-based JSON (intentional, keeps deployment dead simple)
- **TA calculations** — pure TypeScript: RSI, MACD, EMA, Bollinger Bands, Stochastic, ATR, ADX
- **Data** — Binance API (crypto), Yahoo Finance (forex/commodities)
- **Docker** — single `docker compose up -d` and it works

## The signal engine

This was the interesting part. Most indicator libraries just return numbers. I needed decisions.

The approach: **weighted scoring**.

```typescript
// Simplified version
function scoreIndicators(indicators: AllIndicators, candles: OHLCV[]): SignalScore {
  let buyScore = 0;
  let sellScore = 0;
  
  // RSI
  if (indicators.rsi < 35) buyScore += 2;
  else if (indicators.rsi > 65) sellScore += 2;
  
  // MACD histogram direction
  if (indicators.macd.histogram > 0) buyScore += 1.5;
  else sellScore += 1.5;
  
  // EMA crossover
  if (indicators.ema.ema20 > indicators.ema.ema50) buyScore += 1;
  else sellScore += 1;
  
  // Bollinger Band position
  if (price < indicators.bb.lower * 1.01) buyScore += 1.5;
  else if (price > indicators.bb.upper * 0.99) sellScore += 1.5;
  
  // ... more indicators
  
  const totalScore = buyScore + sellScore;
  const confidence = Math.round((Math.max(buyScore, sellScore) / totalScore) * 100);
  
  return {
    direction: buyScore > sellScore ? 'BUY' : 'SELL',
    confidence,
    buyScore,
    sellScore,
  };
}
```

The full version (`apps/web/app/lib/signal-generator.ts`) adds:
- Market quality gating (ATR%, Bollinger bandwidth, EMA trend strength)
- Stochastic confirmation
- Multi-timeframe confluence (+15% confidence if H1/H4/D1 all agree)
- Support/resistance proximity for stop placement

## What I learned building this

### 1. Synthetic fallback is essential

Real trading APIs (Binance, Yahoo Finance) fail. Rate limits, network issues, outages. I built a synthetic fallback that generates realistic OHLCV data deterministically, so the platform always works even without internet.

```typescript
// When live APIs fail, use seeded pseudo-random price simulation
function generateSyntheticCandles(symbol: string, count: number): OHLCV[] {
  let price = BASE_PRICES[symbol] || 100;
  let seed = hashSymbol(symbol);
  
  return Array.from({ length: count }, () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const change = ((seed >>> 0) / 0xffffffff - 0.5) * 0.004;
    // ... generate realistic OHLCV
  });
}
```

### 2. No-database architecture is underrated

My first instinct was PostgreSQL. Instead, I used JSON files for everything — signal history, webhook configs, API keys, paper trading positions, price alerts.

Result:
- Zero setup for self-hosting
- Instant backup (just copy the data/ folder)
- No connection pooling issues
- Works in Vercel Edge functions

The downside: concurrent writes need locking. I used a simple in-memory queue. Good enough for a single-user self-hosted tool.

### 3. The plugin system was worth building

I added a plugin system where users can write custom JavaScript indicators:

```javascript
// Custom VWAP indicator
function compute(candles) {
  let cumPV = 0, cumVol = 0;
  candles.forEach(c => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumVol += c.volume;
  });
  return { value: cumPV / cumVol };
}
```

Each plugin runs in a sandboxed `Function()` with mock candles for validation. Community plugins can be shared as JSON.

### 4. MCP is the new RSS

Just shipped a Model Context Protocol server:

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

Add this to Claude Desktop, and you can ask "What's the current BTC signal?" and get a full indicator breakdown. This is genuinely useful.

### 5. Viral signals from `npx`

The fastest way to get developers to try something is `npx <package>`. No install, no config:

```bash
npx tradeclaw signals --pair BTCUSD
npx tradeclaw-demo
```

The demo command spins up a local Express server with Bloomberg-style UI and a live SSE signal stream. All in under 3 seconds.

## The honest part

Does following these signals make money? I don't know yet.

The signal accuracy pages currently use seed data for demonstration. I've built the infrastructure to track real emitted signals and compute audited outcomes — but that needs months of live data to be meaningful.

I'm not claiming this prints money. I'm claiming it's a well-built, transparent, self-hostable tool for exploring algorithmic signal generation. The math is open source. You can audit every line.

## What's next

- MT4/MT5 broker connectivity (actually send signals to your broker)
- Machine learning confidence model (trained on tracked signal outcomes)
- More assets (stocks, indices, energy)

## Try it

```bash
# Docker (recommended)
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw && docker compose up -d

# Or just demo it
npx tradeclaw-demo
```

Live demo: [tradeclaw.win](https://tradeclaw.win)

GitHub: [naimkatiman/tradeclaw](https://github.com/naimkatiman/tradeclaw) — stars help a lot 🌟

---

*Built with Next.js, TypeScript, and a lot of caffeine. Feedback welcome in the GitHub Discussions.*
