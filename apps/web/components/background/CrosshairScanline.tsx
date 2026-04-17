export function CrosshairScanline({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-x-0 h-px scanline-sweep"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(16,185,129,0.35), transparent)",
          boxShadow: "0 0 12px rgba(16,185,129,0.25)",
        }}
      />
      <div
        className="absolute inset-y-0 w-px"
        style={{
          left: "12%",
          background:
            "linear-gradient(to bottom, transparent, rgba(16,185,129,0.08), transparent)",
        }}
      />
      <div
        className="absolute inset-y-0 w-px"
        style={{
          right: "8%",
          background:
            "linear-gradient(to bottom, transparent, rgba(16,185,129,0.06), transparent)",
        }}
      />
    </div>
  );
}
