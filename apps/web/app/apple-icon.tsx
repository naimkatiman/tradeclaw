import { ImageResponse } from 'next/og';
import { TradeClawIconArtwork } from '../components/brand/tradeclaw-icon-artwork';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <TradeClawIconArtwork width="180" height="180" />,
    { ...size }
  );
}
