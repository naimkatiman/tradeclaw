Advisor confirms the approach and tightened the metric mapping. I have everything needed. Writing the document now.

# Pricing Page A/B Test Plan — TradeClaw Pro

## Provenance and measurement constraints (read first)

This plan is implementable with the funnel already wired in the repo. The only events that exist today (`apps/web/lib/analytics.ts`) are:

| Event | Fired where | Properties available |
|---|---|---|
| `signal_viewed` | signal surfaces | (extend with `signal_class` for test d) |
| `subscription_clicked` | Pro/Elite CTA click (`PricingCards.tsx`) | `tier`, `interval` |
| `checkout_started` | after Stripe session URL returned | `tier`, `interval` |
| `trial_started` | trial begins | (extend to carry `tier`, `interval`) |

What these events **cannot** measure today, and which therefore must be labelled honestly per test: **trial-to-paid conversion, cancellations, refunds, and trial abandonment** are not emitted client-side. Any guardrail that depends on them is marked `needs Stripe-side data` or `needs one added event`. Do not treat them as available.

**Assignment mechanism (real, not hand-waved):** PostHog feature flags assign each visitor to control/variant on first `/pricing` exposure. The assigned bucket is attached as a `variant` property on every event listed above (and on a synthetic `pricing_exposed` event fired on flag evaluation, so the denominator is exposure, not raw pageviews). All rates below are computed as `event count where variant=X / exposures where variant=X`.

**Isolation discipline:** these five tests do **not** run simultaneously on overlapping traffic. They run sequentially in the priority order in the final section, or as mutually-exclusive flag holdouts. Stacking them confounds interaction effects and breaks the one-lever guarantee.

**Sample-size honesty:** the baseline conversion rate `p` and weekly eligible traffic `T` are **pending real data** — they are not invented here. Every sample calculation is given as a formula in `p` and `T`. The illustrative table at the end plugs in example values of `p` purely to show the formula's shape; those are formula inputs, not measured rates. Targets are expressed as **relative lift (MDE)** as required, varied per test by how large an effect the lever can plausibly move.

The two-proportion sample-size formula used throughout (two-sided, α = 0.05, power = 0.80, so `z_α/2 = 1.96`, `z_β = 0.84`):

```
n_per_variant = (z_α/2 + z_β)² · [ p₁(1−p₁) + p₂(1−p₂) ] / (p₂ − p₁)²
             ≈ 7.85 · [ p₁(1−p₁) + p₂(1−p₂) ] / (p₂ − p₁)²
where p₂ = p₁ · (1 + MDE)
runtime_weeks = (n_per_variant · num_variants) / T
```

---

## Test A — Visible price anchor on/off

**Hypothesis.** Showing the truthful struck-through market anchor (`anchorLabel`: "Comparable SaaS dashboards: $200–500/mo") above the Pro/Elite price increases trial starts by making $29 read as cheap relative to the category, versus showing no anchor.

**Lever isolated.** Presence of the `anchorLabel` line only (`pro-anchor` / `elite-anchor` in `PricingCards.tsx`). Price, copy, layout, CTA all unchanged.

**Control / Variant.** Control = anchor hidden on both paid cards. Variant = anchor shown (current production state). Run as control-vs-current so the variant needs no new build.

**Primary metric.** Exposure → `trial_started` rate (all paid tiers combined).

**Guardrail metric.** Elite share of `trial_started` (Elite `trial_started` / total `trial_started`). The anchor must not distort tier mix — if it only pushes people toward Elite, the lift is not a clean win. Measurable today once `trial_started` carries `tier`.

**Sample / runtime reasoning.** Anchoring is a small-effect lever; set **MDE = +8% relative**. With p unknown (`pending real data`), `n_per_variant ≈ 7.85·[p(1−p)+p₂(1−p₂)]/(p₂−p₁)²`, `p₂ = 1.08·p`. Run a minimum of 2 full weeks regardless of accrual to cover weekday/weekend traffic composition, then stop at `max(2 weeks, n reached)`.

**Decision rule.** Ship the anchor if the primary lift is positive and its 95% CI excludes zero, **and** the Elite-share guardrail moves less than 3 percentage points. If the primary CI includes zero at the planned n, keep the simpler control (no anchor) — do not ship neutral complexity. If Elite-share breaches, treat as inconclusive and re-run with tier-split primary.

---

## Test B — Annual label: per-day vs per-year

**Hypothesis.** Framing the annual price as a per-day figure ("$0.79/day", `pro-per-day`) drives a higher share of annual selections than showing the per-year total ("$290/yr") alone, because the daily unit feels trivially affordable.

**Lever isolated.** The annual-interval label format only. Test fires **only when the interval toggle is set to annual**; the monthly card is untouched. Variant swaps the `perDayLabel` line for / against the `/yr` total emphasis.

**Control / Variant.** Control = per-year total emphasised, per-day line hidden. Variant = per-day line shown as the dominant figure (current production shows both; control suppresses the per-day line).

**Primary metric.** Annual share of paid `trial_started` = annual `trial_started` / total paid `trial_started` (uses the `interval` property already on the events).

**Guardrail metric.** Total paid `trial_started` (annual + monthly). The point is to shift mix toward annual **without shrinking the total** — a per-day frame that scares off monthly buyers or depresses overall starts is a loss even if annual share rises.

**Sample / runtime reasoning.** Framing effects on an already-decided buyer are moderate; **MDE = +12% relative** on annual share. Same formula; the relevant base rate is the annual-share proportion, also `pending real data`. Because this only counts annual-eligible sessions, effective traffic is a fraction of `T`; runtime will be longer — budget `runtime_weeks = n·2 / (T · annual_view_fraction)`, `annual_view_fraction` = `pending real data`.

**Decision rule.** Ship per-day framing if annual-share lift CI excludes zero **and** total `trial_started` is non-inferior (variant total within −2% of control). If annual share rises but total drops past the non-inferiority margin, reject — the frame is poaching from, not adding to, the funnel.

---

## Test C — Middle-tier (Pro) highlight vs none

**Hypothesis.** The "Most Popular" badge and emerald emphasis on the Pro card increases Pro trial starts by steering undecided visitors to the intended default tier, versus three visually equal cards.

**Lever isolated.** Pro card's highlight treatment only — the `Most Popular` badge, accent border, and glow (`pro-card` styling). Prices and features unchanged on all three cards.

**Control / Variant.** Control = all three cards rendered with neutral, identical emphasis (no badge, no accent). Variant = Pro highlighted (current production state).

**Primary metric.** Exposure → Pro `trial_started` rate.

**Guardrail metric.** Elite `trial_started` rate. Cannibalization is the specific risk: a louder Pro card can steal Elite buyers, lowering ARPU even as Pro starts rise. Both halves measurable today via the `tier` property.

**Sample / runtime reasoning.** Visual default-steering is a comparatively large-effect lever; **MDE = +15% relative** on Pro starts. Larger MDE → smaller n → shortest runtime of the five. Still enforce the 2-week minimum.

**Decision rule.** Ship the Pro highlight if Pro-start lift CI excludes zero **and** Elite `trial_started` does not fall by more than 5% relative. If Pro rises but Elite falls enough that combined paid starts are flat or down, the highlight is reshuffling not growing — reject and consider highlighting based on total-paid-starts instead.

---

## Test D — Power-of-Free signal class on the Free tier

**Hypothesis.** Giving away one genuinely useful signal class on Free ("One free signal class — the daily regime card, yours forever") increases eventual paid conversion by demonstrating signal quality, versus a Free tier with no standalone free signal class. This is the riskiest lever: the failure mode is the free class satisfying demand and **cannibalizing** paid.

**Lever isolated.** Presence of the free daily-regime signal class as a kept feature on the Free tier. Everything else on the Free card constant.

**Control / Variant.** Control = Free tier without the standalone free signal class (regime card gated behind Pro). Variant = free signal class granted (current production framing).

**Primary metric.** This lever often never touches `/pricing`, so the funnel is longer-horizon and **needs user-level linkage**: `signal_viewed {signal_class:'regime'}` on a Free user → later `subscription_clicked` / `trial_started` by the **same** person. Requires PostHog person profiles and a new `signal_class` property on `signal_viewed` (one added property — small change). Primary = downstream paid `trial_started` rate among the free-class-exposed cohort vs the control cohort.

**Guardrail metric.** Total paid `trial_started` across all visitors must not drop. If handing out a signal class for free lowers overall paid starts, the free class is substituting for the product — the exact thing to catch. Measurable today.

**Sample / runtime reasoning.** Conversion-lift effects of a free teaser are small and slow to materialise; **MDE = +10% relative** on the cohort paid-conversion rate. Because conversion is delayed, set a fixed observation window (e.g. 30 days post-first-free-signal) per cohort and size `n` on cohort size, not pageviews. Base conversion rate and cohort accrual rate are `pending real data`. Expect the longest runtime of the five; do not call it early.

**Decision rule.** Keep the free signal class if cohort paid-conversion lift CI excludes zero **and** the total-paid-starts guardrail shows no significant drop. If conversion is flat **and** total paid starts fall, the free class is cannibalizing — gate it. If conversion is flat but total starts hold, keep it for top-of-funnel/retention value but stop attributing paid lift to it.

---

## Test E — Scarcity seat-cap banner on/off

**Hypothesis.** A banner signalling limited availability ("Founding cohort: N of M seats remaining") increases trial starts by adding urgency, versus no banner.

**Anti-fabrication constraint (binding).** This repo forbids invented numbers — the anchor is truthful, no fake "was $X" prices. A "5 seats left" counter not backed by a real limit is both a fabrication and a dark pattern, and is **out of scope**. This test is only runnable if a **genuine cap exists** — e.g. a real founding-cohort limit on a discounted price or a true capacity constraint — and the banner reflects the actual remaining count from that cap. **If no real cap exists, this test is untestable as specified and must be deferred, not run with a fabricated counter.**

**Lever isolated.** Presence of the (truthful) scarcity banner only. This is a net-new component — no `seat`/`scarcity` element exists in the codebase today (confirmed: no matches in `app/pricing` or `lib`). Build gated behind a flag.

**Control / Variant.** Control = no banner. Variant = banner showing real remaining-seat count.

**Primary metric.** Exposure → `trial_started` rate (all paid tiers).

**Guardrail metric.** Downstream trust — **trial abandonment / cancellation rate**. Scarcity reliably inflates the top of funnel and rots the bottom: people pushed by false-feeling urgency churn. This guardrail is **not measurable with current events** — it `needs Stripe-side data` (cancellations, day-8 charge success) or one added `trial_abandoned` event. Do not run this test until that guardrail is instrumented; without it you cannot detect the characteristic scarcity failure.

**Sample / runtime reasoning.** Urgency banners can move the top of funnel meaningfully; **MDE = +12% relative** on `trial_started`. Same two-proportion formula. Enforce 2-week minimum to avoid a launch-spike artifact reading as a real lift.

**Decision rule.** Ship the banner only if `trial_started` lift CI excludes zero **and** the cancellation/abandonment guardrail does not worsen by more than 3 percentage points. If trials rise but cancellations rise in step (net paid flat or down), the banner is buying noise and trust debt — reject. If no real cap exists, mark `Deferred — requires a genuine seat cap`.

---

## Run order and rationale

Tests cannot run concurrently on overlapping traffic (isolation). Suggested sequential priority, fastest and highest-confidence first:

1. **C (middle-tier highlight)** — largest expected effect, shortest n, lowest build cost (current production is the variant). Settles the default-tier question first.
2. **A (anchor on/off)** — small build, clean isolation, informs all downstream pricing framing.
3. **B (per-day vs per-year)** — depends on annual-interval traffic volume; start once A's framing is settled.
4. **E (scarcity banner)** — net-new component **and** blocked on (i) a real seat cap existing and (ii) the cancellation guardrail being instrumented. Defer until both are true.
5. **D (Power-of-Free)** — longest horizon, needs person-level linkage and a 30-day window; run last and let it accrue in the background while shorter tests cycle.

---

## Instrumentation checklist (to make the plan runnable)

- [ ] Emit `pricing_exposed { variant }` on PostHog flag evaluation at `/pricing` so the denominator is exposure, not pageviews.
- [ ] Attach `variant` to `subscription_clicked`, `checkout_started`, `trial_started`.
- [ ] Add `tier` and `interval` to `trial_started` (currently absent — Tests A/C/B need them).
- [ ] Add `signal_class` to `signal_viewed` and enable PostHog person profiles (Test D).
- [ ] Add a `trial_abandoned` event or wire Stripe cancellation/day-8-charge data (Test E guardrail).
- [ ] Supply real values for `p` (baseline conversion) and `T` (weekly eligible traffic) before computing any n — both currently `pending real data`.

## Illustrative sample-size table (formula inputs, NOT measured rates)

Values below are **hypothetical inputs to show the formula's shape**. They are not TradeClaw's conversion rates, which are `pending real data`.

| Illustrative baseline p | MDE | p₂ = p(1+MDE) | n per variant ≈ 7.85·[p(1−p)+p₂(1−p₂)]/(p₂−p)² |
|---|---|---|---|
| 0.03 | +8% (Test A) | 0.0324 | ≈ 63,900 |
| 0.03 | +15% (Test C) | 0.0345 | ≈ 18,700 |
| 0.05 | +12% (Test E) | 0.0560 | ≈ 16,500 |

Once real `p` and `T` are supplied, plug them into the formula to get true n and `runtime_weeks = n · num_variants / T`.
