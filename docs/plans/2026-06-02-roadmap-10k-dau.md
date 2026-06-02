# TradeClaw — 3-Year Roadmap to 10,000 DAU (2026-06-02)

Synthesis of a 4-persona debate (growth/distribution, product/retention, skeptic/risk,
technical/scale). Today DAU is effectively zero. This is a strategy document — no product code.

## Verdict up front

10,000 DAU in 3 years from zero, pre-revenue, MIT-licensed, solo-operator, in a low-trust regulated
niche is **not a realistic base case**. All four advocates reached that independently. The honest
numbers:

- **Plan-to number: ~2,000 DAU by year 3** (band 1,000–3,000).
- **10,000 is the optimistic ceiling, ~10–20% probability**, reachable only if the operator-multiplier
  loop ignites (downstream users becoming operators) AND signal quality is good enough to retain.
  Both are unproven today.
- The single-user acquisition channels (paid ads, app-store, generic "trading signals" SEO)
  mathematically cannot reach 10k on this budget — positive CAC, one user per dollar, against a
  platform- and regulator-suppressed keyword set.

The only framing under which 10k is even conceivable is **B2B2C: each self-hosted agent daemon wired
to an operator's own Telegram/Discord channel is a DAU multiplier, not a single user.** That is the
spine of this roadmap. Everything else is awareness top-of-funnel or retention plumbing.

---

## North-star metric and what does NOT count

**North-star: Daily Active Humans** =
`agent-daemon heartbeat uniques` + `authenticated hosted-instance daily sessions` + `Telegram bot daily-open uniques`.

Explicitly NOT DAU: GitHub stars, npm downloads, total installs, cumulative signups, MAU. The repo is
currently optimized for stars — a vanity metric that does not convert to daily use. PostHog is already
installed (`apps/web/lib/analytics.ts`, `PostHogPageView.tsx`) but no daily-active cohort is wired, and
Grafana (`grafana/tradeclaw-dashboard.json`) tracks signal quality only, with zero active-user or
connection panels. **DAU is unmeasurable today. That is finding #1 and bet #1.**

### Funnel math (the arithmetic that forces the verdict)

Consumer trading apps land at 5–12% DAU/MAU stickiness (most 5–8%); trading audiences are among the
highest-churn consumer segments.

- 10,000 DAU @ 12% DAU/MAU (generous) ⇒ ~83k MAU.
- ~83k MAU @ 25% MAU/registered (trading apps decay fast) ⇒ ~330k registered.
- ~330k registered @ 2% landing→register (optimistic for a niche, DB-gated tool) ⇒ **~16.5M qualified
  visits over 3 years ≈ 106k qualified visits/week sustained for 156 weeks.** That organic volume does
  not exist for a niche signals tool, solo, unfunded.

Flip it to a credible solo organic ceiling: ~15k–45k registered over 3 years. At 8% DAU/MAU and 25%
MAU/registered on 30k registered ⇒ **~600 DAU** (web-led). Telegram-first changes the multipliers
(push-native, no DB friction lifts DAU/MAU toward 20–30%): 50k subscribers × 0.30 MAU × 0.25 daily-open
⇒ ~3,750 — but 50k subscribers in 3 years solo is itself the aggressive case.

The B2B2C multiplier is the only lever that bends this: 60–120 active operators × 15–30 engaged
end-users each = 900–3,600 downstream DAU before any direct hosted tail, and it compounds if downstream
users become operators. That is the path — and its ceiling at full ignition is where 10k lives.

---

## Three 12-month phases

### Year 1 — Instrument, Focus, Ignite the loop
**Exit DAU: 300–800.**

Thesis: you cannot grow, claim, or falsify a DAU number you do not log, and a solo founder spread
across 18 workspaces moves nothing. Year 1 is measurement, ruthless focus, and a live test of the one
loop that can compound.

Bets:
1. **Instrument DAU before anything else.** Append-only events table via `lib/db-pool.ts` (dashboard
   open, WS subscribe, bot command), `/metrics` counters scraped by the existing Prometheus+Grafana
   stack, a daemon heartbeat ping (anonymous, opt-out), and a PostHog daily-active + D2/D7 retention
   cohort. Technical enabler: the stack already exists; only the panels and emit-points are missing.
2. **Freeze 15 of 18 workspaces to library status.** Keep `apps/web`, `packages/telegram-bot`,
   `apps/ws-server`, and `packages/agent` (the operator daemon). Mothball mobile, MCP, discord,
   extension, CLI, SDKs, action, scaffolder-as-product. Capability is not the constraint; this frees
   ~60% of founder bandwidth for distribution. The default `build` script already builds only
   signals+trading-agents+web, so this is mostly a focus decision, not a code one.
3. **Build the operator wedge + Telegram front door.** `create-tradeclaw` → "connect my Telegram/
   Discord channel" → inject the operator's referral/IB link into every signal message; Telegram-first
   daily push (game-plan + alerts) as the retention loop. Fix the DB-gated boot (degraded/SQLite
   fallback) so the README's "docker run" one-liner actually works for the median operator.

Technical enablers: `apps/web/lib/db-pool.ts`, `apps/web/lib/analytics.ts`, `grafana/`,
`packages/agent/src/server/server.ts`, `packages/telegram-bot/src/bot.ts`,
`apps/web/app/api/alert-rules` + `alert-channels` + `cron/telegram`.

Kill-criteria: after 60 days of instrumentation, DAU < 50 and D2 retention < 15% ⇒ the product has no
daily-use loop; stop infra work and fix the loop. After 30 days, if you cannot get 5 real operators to
run a daemon against a live channel for 2 weeks, the B2B2C thesis is falsified — pivot.

Rough cost: ~$0 cash + founder time; $2k–5k one-time legal review of claim language and broker-execution
risk acknowledgment.

### Year 2 — Compound the operator loop + scale the realtime spine
**Exit DAU: 1,500–3,000.**

Thesis: convert free awareness (the backlink loop) into recurring multi-user DAU, and make the
architecture survive concurrency before you pour traffic in.

Bets:
1. **Operator recruitment at scale (target 60–120 active operators)** using the `t.me/s/` scraping
   prospect playbook; instrument and chase the downstream-user→operator compounding step. This is the
   DAU multiplier; treat operators, not end-users, as the unit of acquisition.
2. **Make ws-server horizontally shardable.** Move connection-counts and message-rate-limit to Redis
   (`INCR` + TTL) so limits hold across instances; designate a single tick "persister" (or a
   Redis-subscribed writer) so N instances stop writing N duplicate ticks into one `Pool(max:5)`; add
   sticky LB / shared connection-count key; edge-cache the read-mostly cached-signals endpoints (they
   already read a Redis payload). Enablers: `apps/ws-server/src/websocket/relay.ts`,
   `middleware/rate-limit.ts`, `subscriptions.ts`, `services/db.ts`, `services/redis.ts`.
3. **Backlink loop + accuracy-page long-tail SEO.** Make every shipped surface (badge SVG, embed card,
   MCP, SDK, Action) link back by default with referrer attribution; ship programmatic per-pair/
   per-timeframe verified win-rate pages with auto OG cards as the trust substrate operators cite.
   Awareness only — not counted as DAU.

Technical enablers: `apps/web/app/api/badge/[pair]/route.ts`, `apps/web/app/embed/*`,
`apps/web/app/api/og/leaderboard/[pair]`, `apps/web/app/api/v1/leaderboard`, `lib/tracked-signals`.

Kill-criteria: after 90 days of recruitment, median engaged end-users per operator < 30 OR fewer than
8 operators still running daily ⇒ the wedge is dead (operators churn faster than audiences convert).
If a 3-instance relay behind an LB cannot hold ~3k concurrent WS at <70% CPU with stable Postgres, the
relay design needs a rethink before more spend.

Rough cost: low hundreds/month infra (2–3 small relay instances + managed Redis + Postgres) + a paid
market-data feed for hosted forex/metals (the one genuinely usage-scaling cost; crypto stays free via
Binance).

### Year 3 — Ignite to the ceiling, or run the realistic niche
**Exit DAU: 3,000 base / up to 10,000 stretch.**

Thesis: by now the data says whether the compounding loop ignites. If the operator multiplier and
signal quality are both proven, fund channel growth from Pro/EarningsEdge revenue (there is finally a
funnel to monetize). If not, optimize and monetize the ~2–3k DAU niche honestly.

Bets:
1. **Fund CAC from revenue.** Only now does paid/partnership acquisition make sense — pre-revenue you
   had no LTV to underwrite it. Reinvest Pro/EarningsEdge margin into the channels that already show
   organic traction.
2. **Harden compliance before scaling traffic.** Centralized, lawyer-reviewed disclaimer on every
   signal/track-record/embed surface; logged risk-acknowledgment gate on broker execution. One
   enforcement action or one viral "TradeClaw blew up my account" thread caps DAU permanently.
3. **Selective unfreeze.** Unfreeze a mothballed surface only if it independently shows >100
   DAU-equivalent/quarter with no founder effort (e.g. organic GitHub Action adoption). Otherwise it
   stays dead.

Kill-criteria: if DAU/MAU cannot sustainably hold above ~10% on a 10k+ subscriber cohort for 90 days,
accept the ceiling, stop chasing 10k, and run the profitable ~2–3k DAU business. Conversely, that same
metric holding 25–30% is the signal that 10k is genuinely in reach and worth funding hard.

Rough cost: scales with revenue; this is the first phase where spending money is justified.

---

## Debate Ledger

Fork 1 — **Distribution channel: operator B2B2C vs Telegram-direct-to-trader.**
- Growth: operators are the only CAC≈0 multiplier (one install → N daily users).
- Product/Skeptic/Technical: Telegram is the daily-habit surface; the web dashboard is high-friction
  and DB-gated.
- Decision: **both, composed** — Telegram is the daily-habit *surface*; the operator wedge is the
  *acquisition multiplier* that fills it. They are not competitors.
- Falsifying assumption: cannot get 5 operators to run a daemon against a live channel for 2 weeks
  within 30 days.

Fork 2 — **Build more product vs freeze the surface area.**
- Product: per-user features (game-plan, one-tap trade, streaks) drive the habit.
- Skeptic/Technical: freeze 15 workspaces; a solo founder across 18 cannot also do distribution.
- Decision: **freeze.** The repo already has 18 packages, ~190 pages, ~218 routes, 4 broker
  integrations, MCP/SDK/extension/Action — and ~zero DAU. Capability is provably not the constraint.
  Keep only the per-user retention features that serve the Telegram loop.
- Falsifying assumption: a frozen workspace independently generates >100 DAU-equivalent/quarter.

Fork 3 — **Personalize signals with per-user LLM vs keep the deterministic shared feed.**
- Technical: keep deterministic. Signals are computed once per cron and shared (O(1) in users); LLM is
  advisory-only (~$0.02/mo total). Per-user LLM converts a near-flat cost curve into one linear in
  users and kills "free forever" at a few thousand DAU.
- Decision: **keep deterministic + shared; LLM stays advisory and paid-gated.** Cheap-shared-
  deterministic is the economic moat, not a gap.
- Falsifying assumption: a non-personalized shared feed is too generic to build a daily habit (digest
  D2/D7 retention collapses after novelty).

Fork 4 — **Is 10k DAU realistic?**
- All four: no, not as a base case. Bands cluster at 1,000–3,000.
- Decision: **plan to ~2,000; treat 10k as a stretch contingent on operator-loop ignition.**
- Falsifying assumption (the bull case): DAU/MAU holds 25–30% on a 10k+ subscriber Telegram cohort for
  90+ days — the skeptic's explicit retraction condition.

Fork 5 — **Onboarding: the README sells a "docker run" one-liner but the web app hard-requires a
Postgres `DATABASE_URL` to boot.**
- Decision: **fix the boot** (degraded/SQLite fallback or honest docs). Onboarding is the top of the
  self-hoster/operator funnel; a broken headline path silently kills acquisition.
- Falsifying assumption: self-hosters do not actually try the docker path (they clone source) — in
  which case fix the documented path instead.

---

## Top 10 risks (ranked) with leading indicators

1. **Signal quality ceiling** — retention's real lever, outside distribution's control. LI: tracked
   hit-rate underperforms a naive baseline; TP-before-SL < 50% on the public leaderboard.
2. **Regulatory / financial-promotion liability** — performance claims (97 source files reference
   accuracy/"profitable") + live broker execution + $29/mo. LI: first user-loss complaint, chargeback
   spike, regulator/processor inquiry, or app-store rejection on financial-advice grounds.
3. **Operator recruitment doesn't scale past founder hand-selling.** LI: time-to-onboard not dropping
   over the first 15 recruits; self-serve channel-connect completion < 40% without a founder call.
4. **Founder bandwidth fragmentation across 18 workspaces.** LI: weekly commits still spread across
   >3 workspaces while the DAU panel stays flat.
5. **Phantom DAU / retention illusion** — daemon installs counted as DAU while end-users don't engage.
   LI: end-user CTR/reaction per signal < 2%; hosted sessions flat while daemon count rises.
6. **Trust collapse on a public losing streak** — the honest track record is asset and liability. LI:
   DAU/MAU dropping in lockstep with rolling win-rate; churn spiking within 48h of a visible red week.
7. **Attribution leak** — MIT license lets operators fork and strip the referral / "powered by",
   severing the backlink loop. LI: share of heartbeats from the default branded build dropping.
8. **DAU unmeasurable today** — optimizing blind. LI: no daily-active number exists in any dashboard
   (the gap itself is the indicator). Mitigated by Year-1 bet 1.
9. **ws-server scaling breaks before connection capacity does** — in-memory per-instance state,
   duplicate per-tick Postgres writes, per-instance rate limits leaking across a multi-instance deploy.
   LI: Postgres write latency/connection saturation climbing as instance count grows; per-IP limits
   exceeding `MAX_CONNECTIONS_PER_IP × instances`.
10. **Free market-data SPOF** — forex/metals poll unauthenticated public endpoints (metals.live,
    open.er-api.com) every 5s. LI: `http-poll` failure rate rising; XAUUSD/EURUSD freshness red while
    crypto stays green.

(Honorable mention: CAC has no funding source pre-revenue — the entire plan rests on organic until
year 3. This is why measurement and the operator loop come first.)

---

## The single highest-leverage thing to ship in the next 30 days

**Ship DAU instrumentation, make Telegram the front door, and recruit 5 operators to run a daemon
against a live channel for 2 weeks.**

Why: every advocate, arguing from a different corner, converged on the same binding constraint — DAU
is invisible and distribution is zero. You cannot grow, claim, or falsify anything without a real
daily-active baseline, and the cheapest possible test of the entire thesis is to stand up the one loop
that could compound (operator → Telegram → daily push) and watch the daily-open cohort. If you cannot
get 5 operators to keep a daemon running for two weeks, the B2B2C multiplier — the only path that makes
10k conceivable — is falsified, and you have learned that in 30 days for ~$0 instead of after a year of
building surface area. Stop building features. Instrument and recruit.
