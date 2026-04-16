# Claude Chrome — TradeClaw Social Posting Playbook

## Setup

1. Open Claude Chrome with X/Twitter logged in
2. Set the bearer token: `SOCIAL_AGENT_TOKEN` (same as Railway env var)
3. Set the base URL: `https://tradeclaw.win`

## Polling Loop

Every 60 seconds:

1. **Fetch next approved post:**
   ```
   GET {BASE_URL}/api/social/next
   Authorization: Bearer {SOCIAL_AGENT_TOKEN}
   ```

2. If `post` is `null`, skip this cycle.

3. If `post` exists:
   - Navigate to x.com/compose/tweet
   - Type `post.copy` into the tweet composer
   - If `post.imageUrl` is present, download the image and attach it
   - Click "Post"
   - Copy the URL of the posted tweet

4. **Report back:**
   ```
   POST {BASE_URL}/api/social/posted
   Authorization: Bearer {SOCIAL_AGENT_TOKEN}
   Content-Type: application/json

   { "id": "{post.id}", "postUrl": "{tweet_url}" }
   ```

## Content Types

| Kind | Description | Human gate? |
|------|-------------|-------------|
| `signal` | Per-signal post with symbol, direction, entry, TP/SL, confidence | Yes — must be approved in `/admin/social-queue` |
| `daily_summary` | End-of-day P/L summary (generated at 00:00 UTC) | No — pre-approved by cron |
| `weekly_summary` | Weekly recap (generated Sunday 18:00 UTC) | No — pre-approved by cron |

## Post Format

**Signal posts:**
```
🟢 XAUUSD BUY @ 2341.50000 | TP1 2348.00000 | SL 2336.00000 | 82% confidence

Track live: https://tradeclaw.win/track-record
```

**Daily summary:**
```
Today on TradeClaw: 12 signals resolved
8W / 4L (66.7% win rate)
P/L: +1.42%

Track live: https://tradeclaw.win/track-record

#TradeClaw #TradingSignals #AlgoTrading
```

**Weekly summary:**
```
TradeClaw Weekly Recap

67 signals | 42W / 25L | 62.7% win rate
Weekly P/L: +4.21%

Best: XAUUSD (+2.13%)
Worst: EURUSD (-0.89%)

Full breakdown: https://tradeclaw.win/track-record

#TradeClaw #WeeklyRecap #AlgoTrading
```

## Error Handling

- If posting fails, do NOT report as posted. The post stays "approved" and retries on the next cycle.
- If the image URL returns 404, post without the image.
- If X rate-limits, wait 15 minutes before retrying.
- If the API returns `{ post: null }`, no posts are queued — skip and check again in 60s.

## Admin Dashboard

Manage the queue at `https://tradeclaw.win/admin/social-queue`:
- View all pending/approved/posted/rejected posts
- Approve or reject signal posts before they go live
- Daily and weekly summaries are auto-approved (no action needed)
