import { ImageResponse } from 'next/og';
import { TradeClawIconArtwork } from '../components/brand/tradeclaw-icon-artwork';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <TradeClawIconArtwork width="512" height="512" />,
    { ...size }
  );
}
