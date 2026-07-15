import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EarningsEdge — AI Earnings Call Analyzer',
  description:
    'Paste any earnings call transcript and instantly get bull case, bear case, key metrics vs expectations, management tone, and a one-line trade thesis.',
};

export default function EarningsEdgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/earningsedge" className="flex items-center gap-2">
            <span className="text-green-400 font-bold text-xl">EarningsEdge</span>
            <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">
              Beta
            </span>
          </a>
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="/earningsedge/analyze"
              className="hidden text-sm text-gray-400 hover:text-white transition-colors sm:inline"
            >
              Analyze
            </a>
            <a
              href="/earningsedge/pricing"
              className="hidden text-sm text-gray-400 hover:text-white transition-colors sm:inline"
            >
              Pricing
            </a>
            <a
              href="/earningsedge/analyze"
              className="whitespace-nowrap rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-green-400 sm:px-4"
            >
              Try Free
            </a>
          </div>
        </div>
      </nav>
      {children}
      <footer className="border-t border-white/10 mt-24 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-start gap-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 EarningsEdge by TradeClaw</span>
          <div className="flex gap-6">
            <a href="/earningsedge/pricing" className="hover:text-gray-300 transition-colors">
              Pricing
            </a>
            <a href="mailto:hello@tradeclaw.win" className="hover:text-gray-300 transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
