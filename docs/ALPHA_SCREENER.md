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

The response must be treated as generated commentary, not evidence of trading edge. Model availability depends on the configured provider; no generated fallback should be described as a live model response.

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
| `OPENROUTER_API_KEY` | Optional | Enables configured model-assisted features. Endpoints return unavailable when the provider is required but not configured. |
| `METAAPI_TOKEN` | Optional | Server-only credential for the admin read-only MetaApi account viewer. Never submit or persist it in a browser. |
| `METAAPI_ACCOUNT_ID` | Optional | Server-only account ID paired with `METAAPI_TOKEN`. Both are required for the viewer. |
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

For a managed Alpha Screener deployment, set `EXPO_PUBLIC_API_URL` to the URL supplied by that operator. This repository does not prove that a particular hosted domain is active.

To build a standalone APK/IPA:

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

---

## Self-hosted Quick Start

```bash
git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env
# Set every REQUIRED value and any optional provider credentials.

docker compose up --build
# App: http://localhost:3000
```

Or deploy to Railway in one click:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/naimkatiman/tradeclaw)

---

## Feature Flags vs Alpha Screener Modules

Some features are gated by environment variables. The table below maps TradeClaw features to
the corresponding Alpha Screener module:

| Feature | TradeClaw activation | Alpha Screener module |
|---|---|---|
| Model-assisted commentary | Set `OPENROUTER_API_KEY` | Availability depends on hosted operator configuration |
| MetaApi account viewer | Set `METAAPI_TOKEN` and `METAAPI_ACCOUNT_ID`; admin only | Read-only viewer, not an execution bridge |
| Telegram delivery | Server bot/channel configuration plus evidence gate | Delivery is configured, not guaranteed |
| Strategy builder | Browser-authored research rules | No measured edge is implied |
| Paper trading | Authenticated PostgreSQL paper simulation | Not broker execution or customer returns |
| Backtesting | Modeled research runs with disclosed assumptions | Not live performance |
| Multi-timeframe analysis | Provider-backed when observed data is available | Fails closed when data is unavailable |
| Leaderboard | Public counted signal-outcome study | Not customer trading performance |

---

## Upgrading TradeClaw

```bash
git pull origin main
cd apps/web && npm install
npm run build
# Restart: docker compose restart web
```

Run the repository migrations for the configured PostgreSQL database before serving the application.
User sessions, signal history, paper simulation, and operational state are not browser-only features.

---

## Support

- Open-source issues: GitHub Issues
- Managed Alpha Screener support: use the contact channel published by the relevant operator
- Documentation: `/docs` folder in this repository
