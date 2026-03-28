# Demo Recording Guide

How to create real terminal recordings and dashboard screenshots for TradeClaw.

---

## Terminal GIF (asciinema + svg-term-cli)

### 1. Record the session

```bash
# Install asciinema
pip install asciinema

# Record (auto-stops on exit)
asciinema rec demo.cast --cols 100 --rows 30

# Inside the recording, run:
npx tradeclaw signals
npx tradeclaw leaderboard --period 7d
exit
```

### 2. Convert to SVG

```bash
# Install svg-term-cli
npm install -g svg-term-cli

# Convert cast → animated SVG
svg-term --in demo.cast --out demo-terminal.svg \
  --window --no-cursor --width 100 --height 30 \
  --term iterm2 --profile "GitHub Dark"
```

### 3. Optimize

```bash
# Compress SVG (optional)
npx svgo demo-terminal.svg -o demo-terminal.min.svg
```

---

## Dashboard Screenshots (Playwright)

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Capture script

```js
// scripts/capture-dashboard.js
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // Retina
  });

  await page.goto("https://tradeclaw.win/dashboard");
  await page.waitForTimeout(3000); // Let animations finish

  await page.screenshot({
    path: "demo-dashboard.png",
    fullPage: false,
  });

  // Capture individual signal cards
  await page.goto("https://tradeclaw.win/demo");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "demo-signals.png" });

  await browser.close();
})();
```

```bash
node scripts/capture-dashboard.js
```

---

## Video Recording (ffmpeg)

### Screen capture → MP4

```bash
# macOS: record screen region (1440x900 at top-left)
ffmpeg -f avfoundation -framerate 30 -video_size 1440x900 \
  -i "1:none" -t 30 demo-raw.mp4

# Linux (X11):
ffmpeg -f x11grab -framerate 30 -video_size 1440x900 \
  -i :0.0+0,0 -t 30 demo-raw.mp4
```

### Trim + optimize

```bash
# Trim to 15 seconds starting at 5s
ffmpeg -i demo-raw.mp4 -ss 5 -t 15 -c:v libx264 -crf 23 demo-trimmed.mp4

# Convert to GIF (for GitHub README)
ffmpeg -i demo-trimmed.mp4 -vf "fps=15,scale=720:-1:flags=lanczos" \
  -c:v gif demo.gif

# Optimize GIF size
gifsicle -O3 --lossy=80 demo.gif -o demo-optimized.gif
```

### Stitch multiple clips

```bash
# Create file list
echo "file 'clip-terminal.mp4'" > clips.txt
echo "file 'clip-dashboard.mp4'" >> clips.txt

# Concatenate
ffmpeg -f concat -safe 0 -i clips.txt -c copy demo-full.mp4
```

---

## Tips

- **Dark mode always** — matches GitHub dark theme and looks more professional
- **Retina (2x)** — always capture at 2x for crisp images on HiDPI screens
- **Consistent dimensions** — use 1440x900 for dashboard, 800x480 for terminal
- **SVG > GIF** — SVGs are smaller, sharper, and animate without quality loss on GitHub
- **Keep recordings short** — 10-15 seconds max; viewers lose interest quickly
