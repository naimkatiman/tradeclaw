import Link from 'next/link';

const FEATURES = [
  {
    icon: '📈',
    title: 'Bull Case',
    desc: 'Specific reasons why this stock could rally after earnings',
  },
  {
    icon: '📉',
    title: 'Bear Case',
    desc: 'Risk factors and headwinds that could drive the stock lower',
  },
  {
    icon: '📊',
    title: 'Key Metrics vs. Estimates',
    desc: 'Revenue, EPS, guidance — did they beat or miss?',
  },
  {
    icon: '🎙️',
    title: 'Management Tone',
    desc: 'Bullish, neutral, or cautious? We read between the lines.',
  },
  {
    icon: '⚡',
    title: 'Trade Thesis',
    desc: 'One sentence that captures the actionable insight for traders',
  },
  {
    icon: '🤖',
    title: 'Powered by Claude AI',
    desc: 'State-of-the-art analysis in seconds, not hours',
  },
];

const TESTIMONIALS = [
  {
    text: "I used to spend 2 hours reading earnings transcripts. Now I get the key insights in 30 seconds.",
    author: "Retail trader, r/investing",
  },
  {
    text: "The bull/bear breakdown is exactly what I need to decide whether to hold into earnings or take profit.",
    author: "Options trader",
  },
  {
    text: "Finally, something that reads earnings calls so I don't have to. The management tone analysis is spot on.",
    author: "Swing trader",
  },
];

export default function EarningsEdgeLanding() {
  return (
    <main>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-sm font-medium">AI-powered earnings analysis</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Understand earnings calls
          <br />
          <span className="text-green-400">in 30 seconds</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Paste any earnings call transcript and instantly get a bull case, bear case, key metrics
          vs. analyst expectations, management tone, and a one-line trade thesis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/earningsedge/analyze"
            className="bg-green-500 hover:bg-green-400 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            Analyze a transcript — free
          </Link>
          <Link
            href="/earningsedge/pricing"
            className="border border-white/20 hover:border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            See pricing →
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-4">3 free analyses. No credit card required.</p>
      </section>

      {/* Demo result preview */}
      <section className="max-w-4xl mx-auto px-6 mb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-2xl font-bold">NVDA</div>
            <div className="text-gray-400">NVIDIA Corporation — Q4 2025 Earnings</div>
            <div className="ml-auto text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-1 rounded">
              high confidence
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
              <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                <span>📈</span> Bull Case
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Data center revenue grew 93% YoY, beating estimates by $2.1B</li>
                <li>• Blackwell architecture demand exceeding supply — strong pricing power</li>
                <li>• Management raised Q1 guidance above Wall Street consensus</li>
              </ul>
            </div>

            <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
              <div className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                <span>📉</span> Bear Case
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Gaming segment down 12% — consumer weakness persists</li>
                <li>• China export restrictions creating $4B+ annual headwind</li>
                <li>• Gross margins guided slightly below consensus for next quarter</li>
              </ul>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="text-yellow-400 font-semibold mb-2">⚡ Trade Thesis</div>
            <p className="text-white text-sm">
              NVDA remains the clear AI infrastructure winner with accelerating data center demand,
              but near-term upside may be limited given already-elevated valuation and China headwinds —
              buy on dips below $580.
            </p>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Sample output — paste your own transcript to analyze
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need to trade earnings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold mb-2">{f.title}</div>
              <div className="text-sm text-gray-400">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 mb-24">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Paste transcript', desc: 'Copy the earnings call transcript from Seeking Alpha, the IR website, or anywhere else.' },
            { step: '2', title: 'AI analyzes', desc: 'Claude AI reads the full transcript in seconds and extracts the key trading insights.' },
            { step: '3', title: 'Trade with edge', desc: 'Get bull/bear cases, metrics vs. estimates, tone analysis, and your trade thesis.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-green-400/10 border border-green-400/30 rounded-full flex items-center justify-center text-green-400 font-bold text-lg mx-auto mb-4">
                {item.step}
              </div>
              <div className="font-semibold mb-2">{item.title}</div>
              <div className="text-sm text-gray-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
              <p className="text-gray-300 text-sm mb-4 italic">"{t.text}"</p>
              <p className="text-gray-500 text-xs">— {t.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 mb-24 text-center">
        <div className="bg-gradient-to-r from-green-400/10 to-emerald-400/5 border border-green-400/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Stop reading 60-page transcripts.
            <br />
            Start trading with edge.
          </h2>
          <p className="text-gray-400 mb-8">
            3 free analyses to start. Upgrade for unlimited access at $29/month.
          </p>
          <Link
            href="/earningsedge/analyze"
            className="bg-green-500 hover:bg-green-400 text-black font-bold text-lg px-10 py-4 rounded-xl transition-colors inline-block"
          >
            Analyze your first transcript →
          </Link>
        </div>
      </section>
    </main>
  );
}
