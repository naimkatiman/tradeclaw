# tradeclaw-demo

> Run a local TradeClaw interface fixture using explicitly synthetic, non-market values.

## Usage

```bash
npx tradeclaw-demo
```

`npx` downloads the package when needed and starts a local server. Startup time and any package-download or network costs depend on your environment.

This package does **not** connect to a market-data provider, run the production signal engine, execute trades, or demonstrate portfolio performance. Its changing values are deterministic UI fixtures.

## What you get

- Illustrative BUY/SELL candidate-card layouts
- Synthetic RSI, MACD, and price-level fields for UI inspection
- A local REST/SSE fixture API marked `dataQuality: "synthetic"`
- Links to the MIT-licensed source and project documentation

## Deploy your own

After trying the demo:

```bash
# Docker
docker run -p 3000:3000 ghcr.io/naimkatiman/tradeclaw

# Review the repository deployment documentation for hosted options.
```

## Links

- 🌐 **Project site**: https://tradeclaw.win
- 🐙 **GitHub**: https://github.com/naimkatiman/tradeclaw
- 📖 **Docs**: https://tradeclaw.win/docs

---

The source code is MIT licensed. Hosting, market-data providers, messaging providers, model APIs, and broker services can have separate terms and costs.
