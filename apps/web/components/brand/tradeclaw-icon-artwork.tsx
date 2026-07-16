import type { SVGProps } from 'react';

type TradeClawIconArtworkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function TradeClawIconArtwork({
  title = 'TradeClaw',
  ...props
}: TradeClawIconArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" fill="none" role="img" aria-label={title} {...props}>
      <defs>
        <linearGradient id="tradeclaw-claw-gradient" x1="34" y1="28" x2="89" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#bbf7d0" />
          <stop offset="48%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <radialGradient id="tradeclaw-glow-gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 55) rotate(90) scale(38)">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="6" y="6" width="108" height="108" rx="28" fill="#05070a" />
      <rect x="6" y="6" width="108" height="108" rx="28" stroke="#153d2e" strokeWidth="1.5" />
      <circle cx="60" cy="55" r="38" fill="url(#tradeclaw-glow-gradient)" />

      <g stroke="url(#tradeclaw-claw-gradient)" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M39 31C34 46 35 62 46 82" strokeWidth="6" />
        <path d="M56 27C50 45 52 65 63 88" strokeWidth="6" />
        <path d="M73 29C67 49 69 69 81 90" strokeWidth="6" />
        <path d="M34 40C47 31 61 29 78 30" strokeWidth="3.25" opacity="0.72" />
      </g>

      <path
        d="M31 87L46 75L59 79L75 62L89 67"
        stroke="#bbf7d0"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="89" cy="67" r="4.5" fill="#f5f5f0" />
    </svg>
  );
}
