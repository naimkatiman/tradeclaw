# Notion Integration

Export TradeClaw trading signals to a Notion database.

## Prerequisites

- A Notion account
- A running TradeClaw instance (self-hosted or local)

## Setup

### 1. Create a Notion Integration

Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create a new **internal** integration.

- Name: `TradeClaw Signals` (or anything you like)
- Associated workspace: select your workspace
- Capabilities: **Insert content** and **Read content**

### 2. Copy the Integration Token

After creating the integration, click **Show** next to the Internal Integration Token and copy it. It starts with `ntn_` or `secret_`.

### 3. Create a Notion Database

Create a full-page database in Notion with these columns:

| Column | Type | Notes |
|--------|------|-------|
| Name | Title | Auto-filled: `PAIR DIRECTION TIMEFRAME` |
| Pair | Select | Options: BTCUSDT, ETHUSDT, XAUUSD, etc. |
| Direction | Select | BUY (green), SELL (red) |
| Confidence | Number | Format: percent |
| Timeframe | Select | 1h, 4h, 1d |
| Entry Price | Number | Format: number |
| MACD Signal | Select | bullish (green), bearish (red) |
| Outcome | Select | WIN (green), LOSS (red), PENDING (gray) |
| Date | Date | Signal timestamp |
| PnL % | Number | Format: percent |

Or use the schema endpoint to get a ready-to-use curl command:

```bash
curl -s https://your-tradeclaw.com/api/notion/schema | jq .curl -r
```

### 4. Share the Database with Your Integration

1. Open your database in Notion
2. Click the **...** menu in the top-right corner
3. Select **Add connections**
4. Find and select your integration name

### 5. Get the Database ID

The database ID is in the URL when you open the database:

```
https://www.notion.so/<workspace>/<database_id>?v=...
```

Copy the `<database_id>` part (32-character hex string).

## Syncing Signals

### Via the Web UI

Go to `/notion` on your TradeClaw instance and use the interactive sync form.

### Via curl

```bash
curl -X POST https://your-tradeclaw.com/api/notion/sync \
  -H 'Content-Type: application/json' \
  -d '{
  "token": "ntn_YOUR_TOKEN",
  "databaseId": "YOUR_DATABASE_ID",
  "pair": "BTCUSDT",
  "direction": "BUY",
  "minConfidence": 70,
  "limit": 25
}'
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `token` | Yes | Notion integration token |
| `databaseId` | Yes | Notion database ID |
| `pair` | No | Filter by trading pair (e.g., BTCUSDT) |
| `direction` | No | Filter by BUY or SELL |
| `minConfidence` | No | Minimum confidence threshold (0-100) |
| `limit` | No | Max signals to sync (1-100, default 50) |

### Response

```json
{
  "success": true,
  "synced": 25,
  "errors": []
}
```

## Automation

Set up a cron job to auto-sync signals:

```bash
# Sync top 25 high-confidence signals every hour
0 * * * * curl -s -X POST https://your-tradeclaw.com/api/notion/sync \
  -H 'Content-Type: application/json' \
  -d '{"token":"ntn_YOUR_TOKEN","databaseId":"YOUR_DB_ID","minConfidence":75,"limit":25}'
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Invalid or expired token | Regenerate token at notion.so/my-integrations |
| 404 Not Found | Database not shared with integration | Share database via "Add connections" |
| 400 Bad Request | Missing required properties in database | Ensure all columns from the schema exist |
| 429 Rate Limited | Too many requests | Reduce batch size or add delay between syncs |

## Rate Limits

The Notion API allows 3 requests per second. TradeClaw adds a 350ms delay between page creations. With a limit of 100 signals, a full sync takes about 35 seconds.

For Vercel-hosted instances (10s function timeout), use `limit: 25` or lower.
