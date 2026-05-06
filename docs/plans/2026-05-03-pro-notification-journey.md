# Pro Notification Journey — Layers 1 & 2

**Date:** 2026-05-03
**Scope:** Smooth onboarding for Pro subscribers across the three notification channels (Telegram bot DM, Pro Telegram group, browser push). Layers 1 + 2 of the larger plan ship the browser push half end-to-end.

## Outcome

After this lands, a Pro subscriber on `/welcome` can:

1. Tap **Enable browser alerts** → grant permission → see a confirmation push fired from the server (proves the round trip works).
2. From that point on, real-time signals broadcast to the Pro Telegram group can also be pushed to the browser (subscription saved with their alert prefs).

## Out of scope (later layers)

- Layer 3: Bot DM tier-aware `/status` and Pro acknowledgement.
- Layer 4: Notification health card on dashboard.
- Layer 5: Mobile app (Expo) — separate plan.
- Wiring web push into the live signal recording path. This plan only proves the channel works end-to-end. Hooking it into `tracked-signals.ts` lands in a follow-up so we can monitor delivery health on a small audience first.

## Current state (verified 2026-05-03)

| Piece | File | State |
|---|---|---|
| Push subscribe API | `apps/web/app/api/notifications/subscribe/route.ts` | ✅ saves to JSON store |
| Push subscription store | `apps/web/lib/push-subscriptions.ts` | ✅ |
| SW push + notificationclick | `apps/web/public/sw.js` | ✅ implemented (deep link via `data.url`) |
| Browser permission helpers | `apps/web/lib/notifications.ts` | ✅ `requestNotificationPermission`, `registerServiceWorker` |
| Test endpoint | `apps/web/app/api/notifications/test/route.ts` | ❌ mock — does not actually send |
| `web-push` dep | `apps/web/package.json` | ❌ not installed |
| VAPID keys | env | ❌ not configured |
| Welcome page UI | `apps/web/app/welcome/WelcomeClient.tsx` | ❌ no Step 3 |

## Plan

### Commit 1 — Layer 2: server-side push delivery + SW polish

1. Add `web-push` to `apps/web` deps.
2. New `apps/web/lib/web-push-server.ts`:
   - Reads `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT` (mailto:).
   - Configures `webpush.setVapidDetails` once.
   - `sendPush(record, payload)` — calls `webpush.sendNotification`. On `404`/`410`, deletes the dead subscription. Returns `{sent, removed}`.
   - `sendPushToAll(payload)` — iterates `listPushSubscriptions()`, returns counts.
   - All failures logged via `console.warn` (consistent with existing notification libs); never throws to caller.
3. Rewrite `apps/web/app/api/notifications/test/route.ts`:
   - POST `{endpoint, title?, body?}` → looks up subscription, calls `sendPush`.
   - Returns `{success, sent, removed}`. Falls back to `400 vapid_not_configured` if env missing.
4. Tiny SW polish in `apps/web/public/sw.js`:
   - `notificationclick` action `view` should also navigate (currently only the default click does); align `view` and default behaviour.
   - Replace `client.navigate(url)` with `clients.openWindow(url)` if the existing client URL doesn't already match — fixes a Chrome edge case where an already-focused tab on a different route never navigates.
5. Add VAPID env vars to `apps/web/app/docs/configuration/page.tsx` doc table.

**Verification:**
- `npm run build -w apps/web` clean.
- Manual: `npx web-push generate-vapid-keys` locally → set the three env vars → `curl -X POST http://localhost:3000/api/notifications/test -d '{"endpoint":"<seed-endpoint>"}'` returns `404` (seed endpoints are fake), confirms wiring + dead-sub removal.

### Commit 2 — Layer 1: /welcome Step 3 (browser push opt-in)

1. Extend `apps/web/app/welcome/WelcomeClient.tsx`:
   - New `Step 3 — Enable browser alerts`.
   - State machine: `idle | unsupported | denied | granted | subscribing | subscribed | error`.
   - On click:
     a. If `Notification.permission === 'denied'` → show "blocked, fix in browser settings" hint with deep link to chrome://settings/content/notifications.
     b. Else `requestNotificationPermission()`.
     c. On grant: `navigator.serviceWorker.register('/sw.js')` → `ready` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY) })`.
     d. POST subscription to `/api/notifications/subscribe`.
     e. POST same endpoint to `/api/notifications/test` so the user immediately sees a confirmation push — closes the loop visually.
   - If `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` is missing at build time, render the step disabled with "Coming soon" rather than 500-ing.
2. `urlBase64ToUint8Array` helper inline (12 lines, standard).
3. New optional env: `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` (must match the server-side public key).

**Verification:**
- `npm run build -w apps/web` clean.
- Manual on `/welcome` after Stripe checkout (or with `?mock` param if available): tap Step 3 → browser prompt → push notification arrives within ~1s.
- Confirm `data/push-subscriptions.json` got the new endpoint.
- Lighthouse PWA check still green.

## Risks

| Risk | Mitigation |
|---|---|
| VAPID keys not set on Railway → Step 3 button breaks for production users | Server returns `400 vapid_not_configured`; client renders "Coming soon" if `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` missing — never shows a broken button |
| Stale push subscriptions accumulate | `sendPush` deletes on 404/410 |
| `web-push` Node-only — Edge runtime breakage | Keep `lib/web-push-server.ts` server-only and only imported from `app/api/notifications/test/route.ts` (default Node runtime) |
| Service worker cache version (`tradeclaw-v3`) needs bump if SW logic changes | Bump to `v4` in commit 1 SW edit |

## Follow-up tickets (do NOT do in this plan)

- Layer 3 (bot tier acknowledgement)
- Layer 4 (dashboard health card)
- Wire `sendPushToAll` into `tracked-signals.ts` after we've watched delivery for a few days
- Mobile app (Expo) — separate plan
