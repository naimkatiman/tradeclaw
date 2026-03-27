# Product Hunt Launch Playbook — TradeClaw

A step-by-step guide for launching TradeClaw on Product Hunt successfully.

---

## Listing Details

**Product name:** TradeClaw

**Tagline options** (pick one, max 60 chars):
1. `Self-hosted AI trading signals. Free forever. Deploy in 5 min.`
2. `Open-source Bloomberg terminal for indie traders.`
3. `Stop renting your trading edge. Own it.`

**Short description** (< 260 chars):
> TradeClaw is a self-hosted AI trading signal platform for forex, crypto & metals. RSI/MACD/EMA confluence scoring, backtesting, paper trading, Telegram alerts. MIT licensed. Docker deploy in 5 min.

**Topics/tags:**
- Open Source
- Trading
- Artificial Intelligence
- Fintech
- Developer Tools
- Crypto
- Self-Hosted

**Links:**
- Website: `https://tradeclaw.win`
- GitHub: `https://github.com/naimkatiman/tradeclaw`
- Demo: `https://web-production-a5139.up.railway.app/dashboard`

---

## Gallery Images (1270 × 760 px recommended)

Prepare these 6 screenshots before submitting:

1. **Dashboard — Live Signals** — Full dashboard with 12 asset signal cards, confidence badges, live price ticker
2. **Signal Detail Page** — `/signal/XAUUSD-H1-BUY` with AI analysis, indicator breakdown, key levels, share button
3. **Backtesting Results** — Price chart with EMA overlays and signal triangles, RSI/MACD panel, performance metrics
4. **Paper Trading Portfolio** — Virtual portfolio with equity curve canvas, open positions P&L, performance stats
5. **Strategy Builder** — Visual drag-and-drop strategy composer with indicator blocks and JSON export
6. **Telegram Alert** — Screenshot of a TradeClaw Telegram bot message (BUY/SELL badge, price levels, confidence)

**Pro tip:** Use `playwright screenshot` or a browser extension for pixel-perfect 1270×760 captures. Dark background preferred.

---

## First Comment Template

Post this as your **first comment immediately after launch** (within the first 5 minutes):

---

Hey Product Hunt! 👋 I'm Naim, the maker of TradeClaw.

I built TradeClaw because I was tired of paying $50–$300/month for trading signal platforms that I couldn't audit, customize, or trust. Every "AI" signal was a black box. So I open-sourced one.

TradeClaw gives you real-time buy/sell signals for 12 forex, crypto & metal pairs — powered by RSI, MACD, EMA-20/50/200, and Bollinger Bands confluence scoring. You self-host it on your own VPS or even a Raspberry Pi. One command: `docker compose up`.

What you get:
• Real-time signals with multi-indicator confluence scoring
• Full backtesting engine with Sharpe ratio, win rate & drawdown metrics
• Paper trading simulator with live P&L tracking
• Telegram bot for instant buy/sell notifications
• Visual strategy builder with JSON export
• Plugin system for custom indicators

It's MIT licensed. Free forever. No accounts, no subscriptions, no black boxes.

What's next: options flow analysis, broker API integration (OANDA, Interactive Brokers), and a hosted SaaS tier for traders who don't want to self-host.

I'd love to hear your feedback — especially from fellow algo traders. What features would make you switch from your current setup? 🙏

---

## Day-Before Checklist

- [ ] README is polished (badges, screenshots, quick-start, deploy buttons)
- [ ] Live demo is up and responsive (`/dashboard`, `/backtest`, `/paper-trading`)
- [ ] All 6 gallery screenshots taken at 1270×760 px
- [ ] PH listing draft reviewed (tagline, description, topics, links)
- [ ] First comment text finalised and saved
- [ ] Social post drafts ready (Twitter, LinkedIn, Reddit)
- [ ] Discord/Telegram community announcement prepared
- [ ] GitHub repo has no obvious issues (open bugs, broken links, missing docs)
- [ ] `npm run build` passes cleanly
- [ ] Maker account set up on PH with profile picture and bio

---

## Launch Day Protocol

### 12:01 AM Pacific Time — Go Live
PH resets its leaderboard at 12:01 AM PT. Launching exactly then gives you 24 hours of visibility.

1. **Submit the listing** (or schedule it via PH's scheduler)
2. **Post your first comment** within 5 minutes of going live (use the template above)
3. **Share with your inner circle first** — get 10–20 upvotes from people who know you before promoting widely

### First 2 Hours
- Tweet from your personal account (use the pre-written tweet from `/launch`)
- Post in relevant subreddits:
  - r/algotrading — "Show HN" style post
  - r/selfhosted — focus on Docker deploy + no subscriptions
  - r/fintech — focus on open-source angle
- Message Discord communities (algo trading servers, self-hosting servers)
- Alert your Telegram community

### Hours 3–6
- Post LinkedIn article (use the pre-written post from `/launch`)
- Submit to Hacker News: `Show HN: TradeClaw – Self-hosted AI trading signals, MIT license`
  - Post to HN at a high-traffic time (9 AM ET is ideal)
  - Reply to every comment on HN within 30 minutes

### Throughout the Day
- Reply to **every comment** on PH within 1 hour — PH rewards engagement
- Thank every upvoter who comments
- Share PH link in your email signature for the day
- Monitor upvote count vs. competitors on the leaderboard

---

## Common Questions to Prepare For

**"How is this different from TradingView?"**
> TradingView is a charting tool — you watch signals, we generate them. TradeClaw is self-hosted, so you own your data and run it on your own infrastructure. No monthly fees, no vendor lock-in.

**"How are the signals generated?"**
> Multi-indicator confluence: RSI overbought/oversold, MACD histogram crossovers, EMA-20/50/200 position, and Bollinger Bands squeeze. Each signal gets a confluence score (0–100). Signals above the threshold (default: 55) are surfaced. All code is auditable on GitHub.

**"Is there a hosted version?"**
> Yes — Alpha Screener (alphascreen.io) is the hosted SaaS version for traders who don't want to self-host. TradeClaw is the open-source self-hosted version.

**"What's the minimum server to run this?"**
> A $5/month VPS (1 GB RAM, 1 vCPU) is enough. Or a Raspberry Pi 4. Docker Compose handles everything.

**"Are the signals profitable?"**
> We show historical win rates and accuracy stats on the `/accuracy` and `/leaderboard` pages. Past performance doesn't guarantee future results — always paper trade before using real capital.

---

## Responses to Negative Comments

**"This is just technical analysis, it doesn't work"**
> Fair point — pure TA has mixed results. TradeClaw is a tool for confluence-based analysis, not a magic money machine. The backtesting engine lets you validate strategies on historical data before risking capital. We're transparent about the methodology — all code is on GitHub.

**"Another trading bot, yawn"**
> TradeClaw isn't a bot — it's a signal analysis platform. It doesn't execute trades. You self-host it, you control everything, and you can extend it with custom indicators via the plugin system. More like a Bloomberg Terminal you own than a "trading bot."

---

## Asset Checklist

- [ ] Logo: `docs/assets/logo.svg` (also export 512×512 PNG)
- [ ] OG image: 1200×630 dark theme with TradeClaw branding
- [ ] Maker avatar: professional headshot, 200×200 px minimum
- [ ] Gallery: 6 screenshots at 1270×760 px (see list above)
- [ ] Demo video: optional but highly recommended (60–90 seconds, no voiceover needed)

---

## Post-Launch Follow-Up

**Day 1 — evening:**
- Write a thank-you tweet/post summarising launch day results (upvotes, GitHub stars gained, visitors)
- Reply to any remaining PH comments

**Day 2–3:**
- Email the PH newsletter team if you hit top 5 in your category
- Write a short "what we learned" blog post / dev.to article
- Reach out to anyone who asked interesting questions on PH — start conversations

**Week 2:**
- Track metrics: PH upvotes, GitHub stars, Docker pulls, demo visitors
- Close the feedback loop: open GitHub issues for features requested during launch
- Consider posting to `r/opensource` with a "we just launched" update

---

## Metrics to Track

| Metric | Source | Goal |
|--------|--------|------|
| PH upvotes | Product Hunt | Top 5 of the day |
| GitHub stars | GitHub | +100 on launch day |
| Demo visitors | Railway logs | +500 on launch day |
| Docker pulls | Docker Hub | +50 in first week |
| Discord joins | Discord | +20 in first week |

---

*See also: `/launch` page at tradeclaw.win/launch for the public-facing launch HQ.*
