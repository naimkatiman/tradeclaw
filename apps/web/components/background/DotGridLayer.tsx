interface DotGridLayerProps {
  size?: number;
  opacity?: number;
  className?: string;
}

export function DotGridLayer({
  size = 28,
  opacity = 1,
  className = "",
}: DotGridLayerProps) {
  const patternId = `dot-grid-${size}`;
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ color: "var(--hero-grid-dot)", opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
