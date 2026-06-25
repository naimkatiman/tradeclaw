#!/usr/bin/env node
/**
 * Generate Expo mobile app assets from the web app icon.svg
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgPath = path.resolve(__dirname, '../apps/web/public/icon.svg');
const assetsDir = path.resolve(__dirname, '../apps/mobile/assets');

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error('SVG not found:', svgPath);
    process.exit(1);
  }

  fs.mkdirSync(assetsDir, { recursive: true });

  const svgBuffer = fs.readFileSync(svgPath);

  // 1. icon.png — 1024x1024 app icon
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024×1024)');

  // 2. adaptive-icon.png — 1024x1024 Android adaptive foreground
  // Render on transparent background by stripping the dark rects
  const svgTransparent = svgBuffer
    .toString()
    .replace(/<rect[^>]*fill="#[0-9a-fA-F]+"[^>]*\/>/g, '')
    .replace(/<rect[^>]*stroke="#[0-9a-fA-F]+"[^>]*\/>/g, '');

  await sharp(Buffer.from(svgTransparent))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024×1024, transparent)');

  // 3. splash.png — 1242×2436 with dark background and centered icon
  const iconSize = 512;
  const iconBuf = await sharp(svgBuffer)
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();

  const splashWidth = 1242;
  const splashHeight = 2436;
  const left = Math.round((splashWidth - iconSize) / 2);
  const top = Math.round((splashHeight - iconSize) / 2);

  await sharp({
    create: {
      width: splashWidth,
      height: splashHeight,
      channels: 3,
      background: { r: 5, g: 5, b: 5 },
    },
  })
    .composite([{ input: iconBuf, left, top }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ splash.png (1242×2436)');

  // 4. favicon.png — 48×48
  await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (48×48)');

  console.log('\nAll assets generated in', assetsDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
