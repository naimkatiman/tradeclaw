## Pricing Architecture — 3 Tiers, Middle Anchored

Exactly 3 tiers retained (Paradox of Choice). Pro is the highlighted, recommended middle tier, priced against a truthful visible market anchor and reframed per-day for the annual plan.

### Tiers

| Tier | Monthly | Annual | Per-day (annual) | Anchor (struck-through) | Highlighted |
|------|---------|--------|------------------|--------------------------|-------------|
| Free | Free | — | — | — | No |
| **Pro** | **$29** | **$290/yr (save $58)** | **$0.79/day** | ~~Comparable SaaS dashboards: $200-500/mo~~ | **Yes (Most Popular)** |
| Elite | $99 | $990/yr (save $198) | $2.71/day | ~~Comparable SaaS dashboards: $200-500/mo~~ | No |

Per-day math: $290 / 365 = $0.79/day. $990 / 365 = $2.71/day.

### The 9 levers, as applied

1. Framing Effect — proof line is win-rate framed, not raw risk. Cited proof: zaky_strategy 61.5% over 208 resolved signals. Provenance is a LOCAL scanner/dev sample, not the live product's verified production Railway Postgres record. The "% of disciplined weeks closed green" headline number was not invented — it is pending real data.
2. Affordability Illusion — annual reframed as "That's $0.79/day" (Pro) and "$2.71/day" (Elite).
3. Rule of 3 + anchor the middle — 3 tiers, Pro highlighted as Most Popular.
4. IKEA Effect — users assemble their own watchlist (6 symbols, "the whole market you actually watch") and risk profile.
5. Power of Free — Free leads with one free signal class: the daily regime card.
6. Contrast Effect — Pro ($29) sits directly beside Elite ($99) in the grid, so $29 reads small.
7. Paradox of Choice — no 4th tier. The unused `custom` type stays out of the rendered set.
8. Anchoring Bias — visible struck-through "Comparable SaaS dashboards: $200-500/mo" above Pro and Elite. Real market anchor, not a fabricated former price. Free has none.
9. Endowment Effect — existing 7-day free trial of the full signal sheet preserved (Start 7-Day Trial, charged day 8, cancel before then = no charge).

### Honesty guardrails honored
- No invented win-rate, RR, decay, testimonial, or "was $X" price.
- The only cited real number (61.5% / 208 signals) is labeled LOCAL sample provenance.
- The $200-500/mo anchor is the real competitor-cost figure, used as a market comparison, never as this product's former price.

### Files changed
- apps/web/lib/stripe-tiers.ts — added `anchorLabel` + `perDayLabel` to TierDefinition and to Pro/Elite; added the Free signal-class feature.
- apps/web/app/pricing/PricingCards.tsx — render struck-through anchor and per-day line in ProCard and EliteCard.

All existing `data-testid`s preserved; existing Playwright pricing suite stays valid. tsc introduced zero new errors in the two edited files.
