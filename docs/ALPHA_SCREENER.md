# Alpha Screener — TradeClaw Hosted Edition

Alpha Screener is the hosted, managed deployment of TradeClaw. This document explains how
the two relate, and how to connect an Alpha Screener account to a self-hosted TradeClaw instance.

---

## Relationship

| | TradeClaw | Alpha Screener |
|---|---|---|
| **Type** | Open-source, self-hosted | Managed SaaS |
| **Deployment** | Docker Compose / Railway | Hosted by the TradeClaw team |
| **Customisation** | Full source access | Configuration via dashboard |
| **Billing** | Free (infra costs only) | Subscription-based |
| **Updates** | Manual (`git pull`) | Automatic |

Alpha Screener runs the same codebase as TradeClaw. Every feature in TradeClaw is available on
Alpha Screener. Additional Alpha Screener features (premium signal feeds, managed broker bridges,
shared leaderboards) are implemented as optional modules in TradeClaw and require valid API keys.

---

## API Endpoints

Both TradeClaw and Alpha Screener expose the same REST API. Replace `BASE_URL` with either:

- **Self-hosted**: `http://localhost:3000` (or your custom domain)
- **Alpha Screener**: `https://app.alphascreener.io` (requires API key header)

### Signals

```
GET  /api/signals
```

Returns the latest generated signals for all tracked pairs.

**Response**
```json
{
  "signals": [
    {
      "id": "XAUUSD-1234567890",
      "symbol": "XAUUSD",
      "direction": "BUY",
      "confidence": 74,
      "entry": 2183.40,
      "timeframe": "H4",
      "timestamp": 1711234567890
    }
  ],
  "generated": 1711234567890
}
```

### Signal Explanation (AI)

```
POST /api/explain
Content-Type: application/json
```

**Body**
```json
{
  "symbol": "XAUUSD",
  "direction": "BUY",
  "confidence": 74,
  "entry": 2183.40,
  "timeframe": "H4",
  "indicators": ["RSI", "EMA_CROSS"]
}
```

**Response**
```json
{
  "explanation": "Two-sentence technical explanation...",
  "source": "ai"
}
```

`source` is `"ai"` when `ANTHROPIC_API_KEY` is set, otherwise `"fallback"`.

### Telegram Notifications

```
POST /api/telegram
Content-Type: application/json
```

**Body**
```json
{
  "botToken": "YOUR_BOT_TOKEN",
  "chatId": "YOUR_CHAT_ID",
  "signal": { ... },
  "test": false
}
```

---

## Environment Variables

Set these in `.env.local` (self-hosted) or the Railway/Alpha Screener dashboard (managed).

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | Enables real AI explanations via Claude Haiku. Falls back to deterministic pattern matching if unset. |
| `METAAPI_TOKEN` | Optional | Used server-side to proxy broker connections via MetaApi. If unset, tokens are submitted client-side (development only). |
| `NEXT_PUBLIC_APP_URL` | Optional | Public URL for deep links in shared signal cards. |
| `EXPO_PUBLIC_API_URL` | Optional | Override the mobile app API base URL. |

---

## Mobile App (React Native / Expo)

The `apps/mobile` package is a companion Expo app. Build with:

```bash
cd apps/mobile
npm install
EXPO_PUBLIC_API_URL=https://your-instance.railway.app npx expo start
```

For Alpha Screener, set `EXPO_PUBLIC_API_URL=https://app.alphascreener.io`.

To build a standalone APK/IPA:

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

---

## Self-hosted Quick Start

```bash
git clone https://github.com/your-org/tradeclaw
cd tradeclaw
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local — set ANTHROPIC_API_KEY for AI explanations

docker compose up --build
# App: http://localhost:3000
```

Or deploy to Railway in one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/tradeclaw)

---

## Feature Flags vs Alpha Screener Modules

Some features are gated by environment variables. The table below maps TradeClaw features to
the corresponding Alpha Screener module:

| Feature | TradeClaw activation | Alpha Screener module |
|---|---|---|
| AI signal explanations | Set `ANTHROPIC_API_KEY` | Included in all plans |
| Broker bridge (MetaApi) | Set `METAAPI_TOKEN` | Pro plan |
| Telegram alerts | Set bot token in UI | Included in all plans |
| Strategy builder | Available by default | Included in all plans |
| Paper trading | Available by default | Included in all plans |
| Backtesting | Available by default | Included in all plans |
| Multi-timeframe analysis | Available by default | Included in all plans |
| Leaderboard | Available by default | Shared across all users (Pro) |

---

## Upgrading TradeClaw

```bash
git pull origin main
cd apps/web && npm install
npm run build
# Restart: docker compose restart web
```

Migrations are not required for the current release — all state is stored in the browser
(`localStorage`) or via optional third-party integrations.

---

## Support

- Open-source issues: GitHub Issues
- Alpha Screener support: support@alphascreener.io
- Documentation: `/docs` folder in this repository
