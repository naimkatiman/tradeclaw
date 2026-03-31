interface TradeClawLogoProps {
  className?: string;
  id?: string;
}

export function TradeClawLogo({ className = "h-6 w-6 shrink-0", id = "tc" }: TradeClawLogoProps) {
  const gradId = `${id}-claw`;
  const glowId = `${id}-glow`;
  return (
    <svg viewBox="0 0 120 120" fill="none" role="img" aria-label="TradeClaw" className={className}>
      <defs>
        <linearGradient id={gradId} x1="34" y1="28" x2="89" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9ff6cf" />
          <stop offset="48%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#0ea5a4" />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 55) rotate(90) scale(38)">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="28" fill="#05070a" />
      <rect x="6" y="6" width="108" height="108" rx="28" stroke="#163229" strokeWidth="1.5" />
      <circle cx="60" cy="55" r="38" fill={`url(#${glowId})`} />
      <g stroke={`url(#${gradId})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M39 31C34 46 35 62 46 82" strokeWidth="6" />
        <path d="M56 27C50 45 52 65 63 88" strokeWidth="6" />
        <path d="M73 29C67 49 69 69 81 90" strokeWidth="6" />
        <path d="M34 40C47 31 61 29 78 30" strokeWidth="3.25" opacity="0.72" />
      </g>
      <path d="M31 87L46 75L59 79L75 62L89 67" stroke="#9ff6cf" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="89" cy="67" r="4.5" fill="#c7ffe4" />
    </svg>
  );
}

/** Raw SVG string for use in HTML templates (emails, embeds) */
export const TRADECLAW_LOGO_SVG = (size = 28, id = "tc-html") => `<svg viewBox="0 0 120 120" fill="none" width="${size}" height="${size}" role="img" aria-label="TradeClaw">
  <defs>
    <linearGradient id="${id}-claw" x1="34" y1="28" x2="89" y2="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#9ff6cf"/>
      <stop offset="48%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#0ea5a4"/>
    </linearGradient>
    <radialGradient id="${id}-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 55) rotate(90) scale(38)">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="6" y="6" width="108" height="108" rx="28" fill="#05070a"/>
  <rect x="6" y="6" width="108" height="108" rx="28" stroke="#163229" stroke-width="1.5"/>
  <circle cx="60" cy="55" r="38" fill="url(#${id}-glow)"/>
  <g stroke="url(#${id}-claw)" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M39 31C34 46 35 62 46 82" stroke-width="6"/>
    <path d="M56 27C50 45 52 65 63 88" stroke-width="6"/>
    <path d="M73 29C67 49 69 69 81 90" stroke-width="6"/>
    <path d="M34 40C47 31 61 29 78 30" stroke-width="3.25" opacity="0.72"/>
  </g>
  <path d="M31 87L46 75L59 79L75 62L89 67" stroke="#9ff6cf" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="89" cy="67" r="4.5" fill="#c7ffe4"/>
</svg>`;
