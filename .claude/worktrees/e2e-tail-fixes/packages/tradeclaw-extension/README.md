# TradeClaw Chrome extension

A lightweight Manifest V3 browser extension that surfaces the most important TradeClaw signals directly in the browser toolbar.

## What it does

- Shows live BTCUSD, ETHUSD, and XAUUSD signal badges in the popup
- Lets the user set a custom TradeClaw base URL for self-hosted installs
- Stores the visible pairs in Chrome sync storage
- Fetches data from `GET /api/widget/extension`

## Install locally

1. Download the ZIP from `https://tradeclaw.win/downloads/tradeclaw-extension.zip`
2. Unzip it to a folder on disk
3. Open Chrome and visit `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the unzipped folder
6. Open **Options** in the extension and set your TradeClaw base URL

## Build your own ZIP

From this folder:

```bash
zip -r tradeclaw-extension.zip . -x '*.DS_Store'
```

## Files

- `manifest.json` — MV3 manifest
- `popup.html` / `popup.js` — live signal badge popup
- `options.html` / `options.js` — base URL + visible pair settings
- `styles.css` — shared UI styling

## Notes

The extension requests host access for the configured TradeClaw origin so it can fetch live badges from your self-hosted instance or the public demo.
