# GitHub Social Preview Setup

The social preview image is shown when TradeClaw links are shared on Twitter, Slack, Discord, and other platforms that render OpenGraph previews.

## Recommended Image

Use the banner SVG converted to PNG (1280×640px):

**Source:** `apps/web/public/readme-banner.svg`

## How to Set It

1. Go to **https://github.com/naimkatiman/tradeclaw/settings**
2. Scroll to **"Social preview"** section
3. Click **"Edit"**
4. Upload a 1280×640 PNG version of the banner
5. Click **"Set social preview"**

## Convert SVG to PNG

```bash
# Using Inkscape (recommended)
inkscape apps/web/public/readme-banner.svg \
  --export-type=png \
  --export-filename=docs/assets/social-preview.png \
  --export-width=1280 \
  --export-height=640

# Using ImageMagick
convert -background none -size 1280x640 \
  apps/web/public/readme-banner.svg \
  docs/assets/social-preview.png

# Using Node (sharp)
npx sharp-cli -i apps/web/public/readme-banner.svg \
  -o docs/assets/social-preview.png \
  resize 1280 640
```

## Fallback: Use OG Image

The dynamic OG image at `https://tradeclaw.win/api/og` also works as a social preview. Download it and upload directly to GitHub:

```bash
curl -o docs/assets/social-preview.png https://tradeclaw.win/api/og
```

## GitHub Requirements

- **Format:** PNG, JPG, or GIF
- **Size:** 1280×640px recommended (minimum 640×320px)
- **File size:** Under 1MB
- **Aspect ratio:** 2:1

Once set, links shared anywhere will show the TradeClaw branding automatically.
