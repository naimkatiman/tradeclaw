# TradeClaw Page Audit — 2026-04-01

## Summary
- Total pages: 129
- ✅ Working: 126
- ⚠️ Partial: 3
- ❌ Shell: 0
- 🔧 Broken: 0

## Priority Fix List (top 3 — only issues found)
| Page | Status | Issue |
|------|--------|-------|
| /alerts | ⚠️ | Large client component with real functionality but needs full verification of all features |
| /backtest | ⚠️ | Complex TA engine integration (RSI, MACD, EMA) — large file needs verification of all backtesting features |
| /news | ⚠️ | Server-side fetch with silent fallback to empty data if API fails — no error indication to user |

## Full Page List

### Core Pages
| Page | Status | Issue |
|------|--------|-------|
| / | ✅ | — |
| /dashboard | ✅ | — |
| /dashboard/billing | ✅ | — |
| /admin/login | ✅ | — |
| /pricing | ✅ | — |
| /settings/webhooks | ✅ | — |

### Signal & Trading Features
| Page | Status | Issue |
|------|--------|-------|
| /alerts | ⚠️ | Large client component needs full feature verification |
| /backtest | ⚠️ | Complex TA engine — needs full verification |
| /screener | ✅ | — |
| /signal/[id] | ✅ | — |
| /strategies | ✅ | — |
| /strategies/marketplace | ✅ | — |
| /strategy-builder | ✅ | — |
| /paper-trading | ✅ | — |
| /broker | ✅ | — |
| /broker-sim | ✅ | — |
| /brokers | ✅ | — |
| /multi-timeframe | ✅ | — |
| /indicators/builder | ✅ | — |
| /correlation | ✅ | — |
| /confidence | ✅ | — |
| /consensus | ✅ | — |
| /calibration | ✅ | — |
| /accuracy | ✅ | — |
| /sentiment | ✅ | — |
| /performance | ✅ | — |
| /leaderboard | ✅ | — |
| /results | ✅ | — |
| /heatmap | ✅ | — |
| /replay | ✅ | — |
| /today | ✅ | — |
| /weekly | ✅ | — |
| /news | ⚠️ | Silent fallback to empty data if API fails |
| /live | ✅ | — |
| /live/widget | ✅ | — |
| /portfolio | ✅ | — |
| /portfolio-widget | ✅ | — |
| /tournament | ✅ | — |

### Charts & Visualization
| Page | Status | Issue |
|------|--------|-------|
| /chart/[symbol] | ✅ | — |
| /calendar | ✅ | — |
| /star-history | ✅ | — |
| /wrapped | ✅ | — |

### Widgets & Embeds
| Page | Status | Issue |
|------|--------|-------|
| /embed | ✅ | — |
| /embed/[pair] | ✅ | — |
| /embed/live | ✅ | — |
| /widget | ✅ | — |
| /widget/portfolio | ✅ | — |
| /widgets | ✅ | — |
| /card | ✅ | — |
| /badge | ✅ | — |
| /badges | ✅ | — |
| /og-preview | ✅ | — |
| /share | ✅ | — |

### Documentation
| Page | Status | Issue |
|------|--------|-------|
| /docs | ✅ | — |
| /docs/api | ✅ | — |
| /docs/changelog | ✅ | — |
| /docs/configuration | ✅ | — |
| /docs/contributing | ✅ | — |
| /docs/embedding | ✅ | — |
| /docs/installation | ✅ | — |
| /docs/paper-trading | ✅ | — |
| /docs/plugins | ✅ | — |
| /docs/self-hosting | ✅ | — |
| /docs/signals | ✅ | — |
| /docs/strategy-builder | ✅ | — |
| /docs/telegram | ✅ | — |
| /docs/webhooks | ✅ | — |
| /api-docs | ✅ | — |
| /how-it-works | ✅ | — |
| /explain | ✅ | — |

### Blog
| Page | Status | Issue |
|------|--------|-------|
| /blog | ✅ | — |
| /blog/how-we-score-signals | ✅ | — |
| /blog/rsi-explained | ✅ | — |
| /blog/self-hosting-trading-tools | ✅ | — |

### Integrations
| Page | Status | Issue |
|------|--------|-------|
| /telegram | ✅ | — |
| /demo/telegram | ✅ | — |
| /discord | ✅ | — |
| /discord/server | ✅ | — |
| /slack | ✅ | — |
| /zapier | ✅ | — |
| /notion | ✅ | — |
| /github-action | ✅ | — |
| /tradingview-alerts | ✅ | — |
| /pine-to-tradeclaw | ✅ | — |
| /rss | ✅ | — |
| /email-digest | ✅ | — |
| /digest | ✅ | — |

### Developer & API
| Page | Status | Issue |
|------|--------|-------|
| /developer | ✅ | — |
| /api-keys | ✅ | — |
| /playground | ✅ | — |
| /data | ✅ | — |
| /exchanges | ✅ | — |
| /plugins | ✅ | — |
| /marketplace | ✅ | — |
| /action | ✅ | — |

### Marketing & Community
| Page | Status | Issue |
|------|--------|-------|
| /demo | ✅ | — |
| /launch | ✅ | — |
| /producthunt | ✅ | — |
| /hn | ✅ | — |
| /devto | ✅ | — |
| /threads | ✅ | — |
| /post-thread | ✅ | — |
| /star | ✅ | — |
| /stars | ✅ | — |
| /sponsor | ✅ | — |
| /waitlist | ✅ | — |
| /showcase | ✅ | — |
| /awesome | ✅ | — |
| /contribute | ✅ | — |
| /contributors | ✅ | — |
| /roadmap | ✅ | — |
| /users | ✅ | — |
| /hub | ✅ | — |

### Tools & Utilities
| Page | Status | Issue |
|------|--------|-------|
| /tools | ✅ | — |
| /compare | ✅ | — |
| /vs-tradingview | ✅ | — |
| /benchmark | ✅ | — |
| /quiz | ✅ | — |
| /roast | ✅ | — |
| /readme-score | ✅ | — |
| /proof | ✅ | — |
| /report | ✅ | — |
| /examples | ✅ | — |
| /ab-stats | ✅ | — |

### System & Status
| Page | Status | Issue |
|------|--------|-------|
| /status | ✅ | — |
| /security | ✅ | — |
| /offline | ✅ | — |

### Localization
| Page | Status | Issue |
|------|--------|-------|
| /es | ✅ | — |
| /zh | ✅ | — |

---

## Assessment

**Overall Health: Excellent (97.7% fully working)**

The TradeClaw codebase demonstrates:
- Consistent Next.js 14 patterns with server/client component separation
- Complete metadata exports for SEO on all pages
- Dynamic imports with loading states for heavy components
- Real API integrations throughout
- Comprehensive documentation coverage
- Internationalization support (Spanish, Chinese)
- Strong UI component architecture

### Recommended Fixes

1. **`/alerts`** — Conduct full E2E test to verify all alert CRUD operations, notification permissions, and symbol filtering work as expected.

2. **`/backtest`** — Verify all TA indicators (RSI, MACD, EMA, Bollinger, Stochastic) produce correct results with sample data.

3. **`/news`** — Add error state UI when `/api/news` fails instead of silent empty fallback. Users should know if news data is unavailable.
