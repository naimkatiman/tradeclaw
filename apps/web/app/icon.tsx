import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#050505',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* T letter */}
        <div
          style={{
            fontSize: 280,
            fontWeight: 900,
            color: '#10b981',
            letterSpacing: '-8px',
            fontFamily: 'sans-serif',
            display: 'flex',
          }}
        >
          T
        </div>
        {/* Arrow accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 120,
            right: 120,
            width: 0,
            height: 0,
            borderLeft: '24px solid transparent',
            borderRight: '24px solid transparent',
            borderBottom: '36px solid #10b981',
            opacity: 0.6,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
