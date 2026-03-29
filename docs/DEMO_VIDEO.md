# Demo Video Recording Guide

## Overview

Record a 2-minute walkthrough of TradeClaw for the GitHub README thumbnail link.

## Recording Checklist

### Setup
- [ ] Run `docker compose up` locally (clean state)
- [ ] Open browser at 1920x1080 resolution
- [ ] Use dark mode (default)
- [ ] Clear any test data / reset paper trading portfolio

### Scenes (aim for ~2 minutes total)

| # | Scene | Duration | What to show |
|---|-------|----------|-------------|
| 1 | Landing page | 10s | Hero, feature highlights, scroll |
| 2 | Signal dashboard | 30s | Live signals updating, BUY/SELL cards, confidence scores |
| 3 | Chart + indicators | 20s | Click into BTCUSD, toggle RSI/MACD/BB overlays |
| 4 | Multi-timeframe | 15s | Switch M5 > H1 > D1, show confluence view |
| 5 | Paper trading | 20s | Execute a signal, show portfolio equity curve |
| 6 | Backtest | 15s | Run backtest on XAUUSD, show monthly heatmap |
| 7 | Telegram bot | 10s | Show /signals command, alert example |
| 8 | CLI demo | 10s | Terminal: `npx tradeclaw signals --pair BTCUSD` |

### Recording Tools
- **Screen capture**: OBS Studio (free) or Loom
- **Resolution**: 1920x1080 or 2560x1440
- **Format**: MP4, H.264
- **Frame rate**: 30fps minimum

### Post-production
- Add subtle zoom/pan on key UI elements
- Include captions for each scene transition
- Add background music (royalty-free, low volume)
- Export as MP4 for YouTube upload

### Publishing
1. Upload to YouTube (unlisted or public)
2. Update README.md thumbnail link: replace placeholder URL with real YouTube link
3. Update `apps/web/public/demo-video-thumbnail.svg` if needed with actual screenshot

## Thumbnail

The current thumbnail at `apps/web/public/demo-video-thumbnail.svg` shows a mock dashboard with a play button overlay. Replace with an actual screenshot once the video is recorded.
