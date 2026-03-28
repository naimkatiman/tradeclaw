# Recording a TradeClaw Demo GIF

A 30-second demo GIF is the single most viral asset for a GitHub repo. Here's how to record one that shows off TradeClaw at its best.

---

## What to Show (30s script)

| Timestamp | Scene |
|-----------|-------|
| 0–5s | `/demo` page loads — 4 live signal cards (BTC/ETH/XAU/EUR) with glowing BUY/SELL badges |
| 5–12s | Wait for the 10-second auto-update — watch confidence scores tick and prices refresh |
| 12–18s | Scroll to the Deploy section — show `docker compose up` code block |
| 18–26s | Click "Open Full Dashboard" → signals list or chart |
| 26–30s | Zoom out to show full page — star banner at top, clean dark UI |

---

## Tools

### macOS (recommended)
- **Kap** (free, open source): https://getkap.co
  File → Export as GIF, set FPS to 15, crop to 800×600 px

- **LICEcap** (simpler): https://www.cockos.com/licecap/

### Linux
```bash
# Install Peek (GTK screen recorder)
sudo apt install peek   # Ubuntu/Debian
# or
sudo snap install peek

# Record → export as GIF
```

### Windows
- **ScreenToGif**: https://www.screentogif.com
  Record → Edit → Save as GIF

---

## Recording Settings

| Setting | Value |
|---------|-------|
| Dimensions | 800 × 600 px (or 1200 × 750 for HiDPI) |
| FPS | 15 fps (lower = smaller file) |
| Duration | 25–35 seconds |
| Target file size | < 5 MB (GitHub shows inline up to 10 MB) |

---

## Setup Before Recording

1. Start the dev server or point to `https://tradeclaw.win`
2. Open `/demo` in a browser at 100% zoom
3. Use a clean browser profile (no extensions visible)
4. Set your browser window to exactly 1200px wide
5. Hide bookmarks bar and dev tools

```bash
# If running locally:
cd tradeclaw
docker compose up
# Then open http://localhost:3000/demo
```

---

## Optimizing the GIF

```bash
# Install gifsicle
brew install gifsicle          # macOS
sudo apt install gifsicle      # Ubuntu

# Compress without visible quality loss
gifsicle --optimize=3 --lossy=80 demo.gif -o demo-optimized.gif
```

Target: **< 3 MB** for best GitHub rendering.

---

## Where to Put It

1. Place the file at `apps/web/public/tradeclaw-demo.gif`
2. Update `README.md` to reference it:

```markdown
## 🎬 Demo

![TradeClaw Live Demo](apps/web/public/tradeclaw-demo.gif)
```

Or host on a CDN and use a direct URL for faster loads.

---

## Pro Tips

- **Slow your mouse** — fast movements look jittery in GIFs
- **Pause 1–2s** on key moments (signal cards, the deploy command)
- **Use dark mode** — the `#050505` background looks stunning in GIFs
- **Record at 2x then export 1x** for smoother motion
- The auto-update at 10 seconds is the money shot — wait for it

---

> Once recorded, add the badge to `README.md`:
>
> ```markdown
> [![Demo](https://img.shields.io/badge/Demo-Live-10b981?logo=vercel)](https://tradeclaw.win/demo)
> ```
