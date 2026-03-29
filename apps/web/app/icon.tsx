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
<<<<<<< HEAD
          background: '#050505',
=======
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 100%)',
>>>>>>> origin/main
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
<<<<<<< HEAD
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
=======
          overflow: 'hidden',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage:
              'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* Glow effect behind the letter */}
        <div
          style={{
            position: 'absolute',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Main TC monogram */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 0,
          }}
        >
          <div
            style={{
              fontSize: 240,
              fontWeight: 900,
              color: '#10b981',
              fontFamily: 'sans-serif',
              lineHeight: 1,
              display: 'flex',
            }}
          >
            T
          </div>
          <div
            style={{
              fontSize: 160,
              fontWeight: 700,
              color: '#6ee7b7',
              fontFamily: 'sans-serif',
              lineHeight: 1,
              marginLeft: -20,
              opacity: 0.7,
              display: 'flex',
            }}
          >
            C
          </div>
        </div>

        {/* Upward chart line accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 80,
            width: 350,
            height: 4,
            background: 'linear-gradient(90deg, transparent 0%, #10b981 50%, #34d399 100%)',
            borderRadius: 2,
            display: 'flex',
          }}
        />

        {/* Up arrow / bullish indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 90,
            right: 72,
            width: 0,
            height: 0,
            borderLeft: '16px solid transparent',
            borderRight: '16px solid transparent',
            borderBottom: '28px solid #34d399',
>>>>>>> origin/main
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
