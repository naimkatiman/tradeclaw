export function ContourLayer({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        color: "var(--accent)",
        opacity: 0.08,
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 30%, black 85%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 30%, black 85%, transparent 100%)",
      }}
    >
      <img
        src="/bg/contours.svg"
        alt=""
        className="absolute inset-x-0 bottom-0 w-full select-none"
        draggable={false}
      />
    </div>
  );
}
