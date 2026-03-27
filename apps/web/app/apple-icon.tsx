import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#050505',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: '#10b981',
            fontFamily: 'sans-serif',
            display: 'flex',
          }}
        >
          T
        </div>
      </div>
    ),
    { ...size }
  );
}
