# GitHub Social Preview Setup

The social preview image is what GitHub, Slack, Discord, and X render when a TradeClaw link is shared.

## Ready-to-upload image

**`docs/assets/social-preview.png`** — 1280x640, ~125 KB.

It is the TradeClaw brand card: the evidence-instrument render with the wordmark and "Open-source trading research". Text is sized to stay readable at link-preview thumbnail size, which a product screenshot does not survive. No conversion step is needed; upload it as-is.

## How to set it

GitHub has no public API for the social preview, so this step is manual and has to be done by a repo admin:

1. Go to <https://github.com/naimkatiman/tradeclaw/settings>
2. Scroll to **Social preview**
3. Click **Edit** -> **Upload an image**
4. Select `docs/assets/social-preview.png`

## GitHub requirements

- **Format:** PNG, JPG, or GIF
- **Size:** 1280x640 recommended (minimum 640x320)
- **File size:** under 1 MB
- **Aspect ratio:** 2:1

`docs/assets/social-preview.png` satisfies all four.

## Alternatives

- `docs/assets/hero-dark.png` — the live homepage capture used in the README, if you prefer a product shot over brand art. Crop it to 2:1 first; note that the headline becomes hard to read at thumbnail size.
- `apps/web/public/social-preview.svg` — the older illustrative card. Needs an SVG-to-PNG conversion first.
- `https://tradeclaw.win/api/og` — the dynamic OpenGraph image used by the site itself:

```bash
curl -o docs/assets/social-preview.png https://tradeclaw.win/api/og
```
