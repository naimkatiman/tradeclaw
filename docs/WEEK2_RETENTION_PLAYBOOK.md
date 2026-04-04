# TradeClaw Week 2 Retention Playbook
## Converting Early Signups → Active Users → Contributors (Day 4–14)

> **Goal:** Turn the ~200 people who discover TradeClaw in Week 1 into users who come back in Week 2, and a subset of those into contributors who open their first PR by Day 14.

---

## The Retention Reality

**OSS retention baseline:**
- Day 1 → Day 7: ~30-40% of visitors return
- Day 7 → Day 14: ~15-20% of Day 1 visitors still active
- Day 14 → Day 30: ~8-12% sustained
- Stargazer → first PR: ~0.5-2% conversion (industry avg)

**What the best projects achieve:**
- Cal.com, Supabase, Appwrite: 40-60% Week 2 retention for users who complete onboarding
- Key insight: **retention isn't about the product — it's about reaching the activation event fast**

**TradeClaw's activation event:** User sees a signal, understands confidence + entry/SL/TP, and either shares it or sets an alert. Once they do that, they're 4x more likely to return.

---

## The Day 4–14 Critical Window

This is where most OSS projects lose people. The novelty of starring/cloning has worn off, but they haven't built a habit yet.

### What Happens in This Window

| Day | User Psychology | What They Need |
|-----|----------------|----------------|
| 4-5 | "I starred this, now what?" | A reason to come back (new signal, digest email) |
| 6-7 | "Is this actually useful for me?" | Personalized value (their pair, their timeframe) |
| 8-10 | "Maybe I should try X feature" | Feature discovery (backtest, paper trading, alerts) |
| 11-14 | "This is cool, I want to customize/fix/add X" | Clear contribution path (good first issue, PR template) |

---

## Retention Tactic 1: The 7-Email Drip (Days 0–14)

**This is the highest-ROI thing TradeClaw can build right now.** Email has 40-60% open rates for onboarding sequences vs. 2% for social posts.

### Email Sequence (triggered on waitlist/subscribe signup)

| # | Day | Subject | Content | CTA |
|---|-----|---------|---------|-----|
| 1 | 0 (immediate) | "Your signals are live" | Welcome + link to dashboard. Show 1 real signal (BTC/XAU). | **Open Dashboard** |
| 2 | 1 | "The signal BTCUSD just hit TP1 ✅" | Show a recent outcome with entry→TP1 price. Build credibility. | **See Accuracy Tracker** |
| 3 | 3 | "You're missing 3 signals/day — here's your digest" | Sample daily digest. Tease the API endpoint. | **Set Up Telegram Alerts** |
| 4 | 5 | "What kind of trader are you?" | Link to /quiz. Based on result, recommend pair+timeframe. | **Take the Quiz** |
| 5 | 7 | "Your TradeClaw Week 1 Recap" | Personalized stats: signals seen, top pair, accuracy. Like Wrapped lite. | **View Your Stats** |
| 6 | 10 | "3 ways to make TradeClaw yours" | (a) Paper trade, (b) Set up webhooks, (c) Build a plugin. | **Try Paper Trading** |
| 7 | 14 | "Join 2 contributors who shipped this week" | Show recent PRs/contributions. Link to good-first-issues. | **Your First PR** |

### Implementation

TradeClaw already has:
- ✅ `/api/subscribe` — email collection with pair preferences
- ✅ `/api/cron/daily-digest` — daily digest cron endpoint
- ✅ `lib/email-subscribers.ts` — subscriber management
- ✅ `lib/email-digest.ts` — HTML email generation

**What's missing (build these):**
1. **Drip sequence state machine** — `lib/email-drip.ts` tracking which email each subscriber has received, with `nextSendAt` timestamps
2. **`/api/cron/drip` endpoint** — runs every hour, sends next email to eligible subscribers
3. **Email templates for emails 1-7** — extend `lib/email-digest.ts` with per-step templates
4. **Outcome-triggered emails** — when a signal hits TP1/TP2, email subscribers who watched that pair

**Effort:** ~1 day of Claude Code work. Use Resend or nodemailer with SMTP.

---

## Retention Tactic 2: The "Aha Moment" Accelerator

Research shows: projects that get users to their "aha moment" within 2 sessions have 3x retention.

### TradeClaw's Aha Moments (in order of impact)

| Aha Moment | Current Path | Friction | Fix |
|------------|-------------|----------|-----|
| **See a signal hit its TP** | Wait for /accuracy page to show it | Passive — user must check | **Push notification + toast when signal resolves** |
| **Share a signal card** | Click share on /signal/[id] | Requires finding the share button | **Auto-prompt share after viewing 3+ signals** |
| **See paper trading P&L** | Navigate to /paper-trading, open position | Multi-step, no guidance | **Auto-follow first signal in paper trading** |
| **Get a Telegram alert** | Navigate to /telegram, set up bot | Requires Telegram bot setup | **One-click browser notification as quick alternative** |

### Implementation Priority

**Build: Signal outcome push notifications**
- When a signal resolves (hits TP1, TP2, SL), check if user has browser notifications enabled
- Send: "🎯 BTCUSD BUY hit TP1 at $71,200 (+1.2%) — signal confidence was 87%"
- This creates an involuntary re-engagement loop
- Already have `public/sw.js` with push notification support

**Build: Auto-follow first signal in paper trading**
- On first visit to dashboard, show a banner: "Follow this signal with $0 risk →"
- One click opens paper trading with position pre-filled from the signal
- User immediately sees live P&L movement
- Activation rate for paper trading probably jumps from ~5% to ~25%

---

## Retention Tactic 3: Progressive Disclosure (Feature Drip)

Don't show everything on Day 1. Reveal features over time.

### Feature Unlock Schedule

| Day | Feature Unlocked | How It's Surfaced |
|-----|-----------------|-------------------|
| 1 | Dashboard + Signals | Default view |
| 3 | Screener filters unlocked | Pulse badge on filter bar: "New: Filter by RSI range" |
| 5 | Paper Trading | Banner: "Ready to test these signals? Paper trade risk-free →" |
| 7 | Backtest | Tooltip on a signal: "This pattern backtests at 67% win rate →" |
| 10 | Strategy Builder | After 2+ backtests: "Build your own strategy from these results" |
| 14 | Plugins/Webhooks | "Power user detected 🔥 — unlock custom integrations" |

### Implementation
- `lib/feature-gates.ts` — check `localStorage` for `tc-first-visit-date`
- Compute `daysSinceFirst = Math.floor((Date.now() - firstVisit) / 86400000)`
- Each feature gate is a simple `daysSinceFirst >= N` check
- Surfaced via `<FeatureUnlockBanner>` component (toast-like, dismissable)

**This is not about restricting access** — all pages remain accessible. It's about **reducing cognitive overload** by highlighting features at the right time.

---

## Retention Tactic 4: Daily Engagement Hooks

### The "Signal of the Day" Loop
Already built (`/today` + `/api/signal-of-the-day`). Now make it sticky:

1. **Daily push notification** at 08:00 user timezone: "Today's top signal: XAUUSD BUY 89%"
2. **Email digest** at same time for subscribers
3. **Social auto-post** to TradeClaw Telegram channel
4. **24h countdown** on /today page — creates urgency/FOMO

### The "Streak" Mechanic
Track consecutive days a user visits the dashboard:

```
Day 1: 🔥 First day
Day 3: 🔥🔥🔥 3-day streak
Day 7: 🔥 7-day streak — unlock "Active Trader" badge
Day 14: 🔥 14-day streak — unlock "TradeClaw Regular" badge
Day 30: 🏆 "TradeClaw OG" badge
```

- Store in `localStorage` as `{ lastVisit: ISO, currentStreak: N, longestStreak: N }`
- Show streak counter in dashboard header (small, non-intrusive)
- Losing a streak triggers: "Your 5-day streak ended yesterday. Start fresh today?"
- **Streaks work.** Duolingo's entire retention strategy is built on this.

---

## Retention Tactic 5: Contributor Conversion Pipeline

### The Funnel: Visitor → User → Contributor

| Stage | % of Total | Trigger | Action |
|-------|-----------|---------|--------|
| **Visitor** | 100% | Lands on GitHub/site | README + demo sell the vision |
| **User** | ~30% | Clones/deploys/visits dashboard | Onboarding checklist activates |
| **Engaged User** | ~12% | Returns Day 3+ | Email drip + feature unlock |
| **Power User** | ~5% | Uses 3+ features | "Contribute" CTA appears |
| **Contributor** | ~1-2% | Opens first PR | Celebration + recognition |

### What Converts Power Users to Contributors

**Research findings from Cal.com, Supabase, and Appwrite:**

1. **"Scratch your own itch" issues** — The #1 reason people contribute is to fix something that bugs them. Create issues titled: "Enhancement: Add [X] filter to screener" and mark them `good-first-issue`
2. **Instant PR review** — Cal.com data: projects that review first PRs within 24h have **2x contributor retention**. After 7 days with no review, contributor never returns.
3. **Public celebration** — Appwrite posts contributor shoutouts on Twitter. Cal.com has a /contributors page. Every first PR should trigger a welcome comment + add to contributors list.
4. **Lower the bar** — Supabase's top contributor driver: docs fixes. Not code. People contribute to docs 5x more than code. Make docs contributions feel valued equally.

### GitHub Automation Already Built
TradeClaw has:
- ✅ `.github/workflows/welcome.yml` — auto-comment on first PR
- ✅ `.github/GOOD_FIRST_ISSUES.md` — 10 templates
- ✅ `/contribute` page with mentorship form
- ✅ `/contributors` page with GitHub API

### What's Missing

**1. Auto-create good-first-issues weekly**
- Cron job that creates 2-3 new `good-first-issue` labeled issues every Monday
- Templates: "Add [PAIR] to signal engine", "Improve [PAGE] mobile layout", "Add TypeScript types to [FILE]"
- Fresh issues signal an active project (stale issues signal abandonment)

**2. Contributor recognition automation**
- When a PR merges, auto-comment: "🎉 Your contribution is now live! You're TradeClaw contributor #N. Your name appears on tradeclaw.com/contributors"
- Post to Telegram/Discord: "New contributor: @username merged [PR title]"

**3. "Your First PR" guided experience**
- `/contribute/first-pr` page: a step-by-step wizard that:
  1. Forks the repo
  2. Shows the file to edit (e.g., add yourself to CONTRIBUTORS.md)
  3. Walks through creating a PR
  4. Estimated time: 5 minutes
- This is exactly what firstcontributions/first-contributions does (60k+ stars, pure onboarding)

---

## Retention Tactic 6: Social Proof Loops

### The "Others Are Using This" Signal
- **Live user count on dashboard:** "47 traders viewing signals right now" (even if approximated via SSE connections)
- **Recent signal outcomes strip:** "XAUUSD BUY hit TP1 12 min ago • EURUSD SELL stopped out 2h ago" (already partially built in LatestOutcomes)
- **GitHub activity feed on /contributors:** "3 PRs merged this week"

### Community Proof
- **Telegram subscriber count** visible on /telegram page (already built)
- **Discord member count** visible on /discord page (already built)
- **Show these numbers on the landing page** — "Join 150+ traders and 12 contributors"

---

## Retention Tactic 7: Re-engagement Triggers

### When to Pull Users Back

| Trigger | Detection | Action |
|---------|-----------|--------|
| **Inactive 3 days** | Last visit > 72h (localStorage check on any page load) | Show banner: "3 signals hit TP while you were away →" |
| **Inactive 7 days** | Email drip sequence | Email: "Your BTCUSD signal from last week hit TP2" |
| **Inactive 14 days** | Email | Email: "TradeClaw shipped 3 new features since you left" |
| **Signal of interest resolves** | Match subscriber's pair preference to resolved signal | Push notification + email |

### The "Win-Back" Email
For users inactive 14+ days, send ONE email (not a sequence):

> **Subject:** "This XAUUSD signal from April 2nd made $47/oz"
>
> The signal you saw on your last visit resolved — here's what happened.
>
> [Signal card with outcome]
>
> 12 new signals are waiting. [→ Open Dashboard]

---

## Implementation Roadmap (Priority Order)

### Week 1 Sprint (Immediate, Highest Impact)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1 | **Visit streak tracker** — localStorage counter + dashboard badge | Daily retention hook | 2h |
| 2 | **Feature unlock banners** — progressive disclosure by day count | Reduce Day 1 overwhelm | 3h |
| 3 | **Signal outcome push notifications** — browser push when TP/SL hit | Involuntary re-engagement | 4h |
| 4 | **Auto paper-trade CTA** — one-click follow signal from dashboard | Aha moment acceleration | 2h |

### Week 2 Sprint (High Impact, More Effort)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 5 | **7-email drip sequence** — `lib/email-drip.ts` + cron endpoint | Highest ROI channel for retention | 1 day |
| 6 | **"Your First PR" wizard page** — `/contribute/first-pr` | Contributor conversion | 3h |
| 7 | **Auto-create good-first-issues** — weekly cron | Signal active project | 2h |
| 8 | **Re-engagement banners** — "3 signals hit TP while you were away" | Win back inactive users | 2h |

### Week 3 Sprint (Polish + Measure)

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 9 | **Live user count** on dashboard | Social proof | 1h |
| 10 | **Contributor celebration automation** — PR merge → comment + post | Contributor retention | 2h |
| 11 | **Win-back email** for 14-day inactive users | Last-resort retention | 2h |
| 12 | **Retention metrics dashboard** — `/admin/retention` with cohort data | Measure everything | 4h |

---

## Success Metrics

Track these weekly:

| Metric | Current (est.) | Target (30 days) | Target (90 days) |
|--------|---------------|-------------------|-------------------|
| Day 1→7 return rate | ~25% | 40% | 50% |
| Day 7→14 return rate | ~10% | 25% | 35% |
| Email open rate (drip) | N/A | 45% | 50% |
| Streak median (active users) | 1 day | 4 days | 7 days |
| Paper trading activation | ~3% | 15% | 25% |
| First PR within 14 days | ~0 | 2/month | 5/month |
| Good-first-issues open | 10 (static) | 10 (rotating) | 15 (rotating) |

---

## OSS Projects That Do This Well (Reference)

### Cal.com (40k+ stars)
- **What works:** PR review <24h, contributor docs are excellent, /contributors page, weekly community calls
- **Steal:** Their issue labeling system (difficulty: easy/medium/hard + area: api/ui/docs)

### Supabase (75k+ stars)
- **What works:** "Launch Week" events create spikes, docs contributions are celebrated equally to code, Discord is extremely active
- **Steal:** Their "launch week" concept — do a "TradeClaw Week" with daily feature drops

### Appwrite (47k+ stars)
- **What works:** Twitter contributor shoutouts, Hacktoberfest-style events, ambassador program
- **Steal:** Their contributor recognition on social media

### Hono (22k+ stars)
- **What works:** Extremely fast issue response, Yusuke Wada personally responds to most issues, simple contribution process
- **Steal:** Maintainer responsiveness — respond to every issue within 12h

---

## TL;DR — The 3 Things That Matter Most

1. **Email drip sequence (Day 0-14)** — This is 10x more effective than any UI change. Most users never return to the site unless something pulls them back. Email is that pull.

2. **Visit streak + progressive feature unlock** — Makes the dashboard feel alive and personal. Users who see "Day 5 🔥" are psychologically invested.

3. **First PR within 5 minutes** — A `/contribute/first-pr` page that walks someone through adding their name to CONTRIBUTORS.md is the lowest-friction way to convert a user into a contributor. Once they've shipped a PR, they're emotionally invested.

Everything else is optimization. Start with these three.
