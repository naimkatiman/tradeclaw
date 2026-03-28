import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
            <path d="M8 14C8 11 10.7 8.5 14 8.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 14C20 17 17.3 19.5 14 19.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="6" y1="22" x2="22" y2="6" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-white mb-2 tracking-tight">You are offline</h1>
        <p className="text-sm text-zinc-600 leading-relaxed mb-6">
          TradeClaw needs a connection to fetch live signals and prices. Check your network and try again.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/20 transition-all"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
