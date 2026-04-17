export function CandlestickGhosts({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity: 0.07 }}
    >
      <img
        src="/bg/candlestick-ghosts.svg"
        alt=""
        className="absolute bottom-0 left-1/2 w-[min(1400px,120%)] -translate-x-1/2 select-none"
        draggable={false}
      />
    </div>
  );
}
