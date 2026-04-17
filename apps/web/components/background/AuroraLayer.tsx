interface AuroraLayerProps {
  intensity?: "subtle" | "soft" | "bold";
  className?: string;
}

const INTENSITY_OPACITY = {
  subtle: 0.35,
  soft: 0.6,
  bold: 0.9,
} as const;

export function AuroraLayer({
  intensity = "soft",
  className = "",
}: AuroraLayerProps) {
  const opacity = INTENSITY_OPACITY[intensity];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute aurora-orb-a"
        style={{
          top: "-10%",
          left: "-10%",
          width: "70%",
          height: "80%",
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.32), rgba(16,185,129,0.08) 45%, transparent 70%)",
          filter: "blur(20px)",
          opacity,
        }}
      />
      <div
        className="absolute aurora-orb-b"
        style={{
          bottom: "-20%",
          right: "-10%",
          width: "65%",
          height: "75%",
          background:
            "radial-gradient(closest-side, rgba(6,182,212,0.22), rgba(6,182,212,0.05) 45%, transparent 70%)",
          filter: "blur(24px)",
          opacity,
        }}
      />
    </div>
  );
}
