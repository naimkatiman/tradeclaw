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
    title: 'Model-assisted review',
    desc: 'Gemini is called through OpenRouter; outputs require human verification',
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
          Structure earnings-call research
          <br />
          <span className="text-green-400">with model-assisted review</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Paste an earnings call transcript to draft a bull case, bear case, extracted metrics,
          management-tone summary, and research thesis. Verify every output against the source.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/earningsedge/analyze"
            className="bg-green-500 hover:bg-green-400 text-black font-bold text-lg px-8 py-4 rounded-xl transition-colors"
          >
            Analyze a transcript — free
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-4">Up to 3 requests per rolling 24 hours per network address. No checkout required.</p>
      </section>

      {/* Demo result preview */}
      <section className="max-w-4xl mx-auto px-6 mb-24">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-2xl font-bold">EXAMPLE</div>
            <div className="text-gray-400">Fictional Company - illustrative output</div>
            <div className="ml-auto text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-1 rounded">
              illustrative self-rating
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
              <div className="text-green-400 font-semibold mb-3 flex items-center gap-2">
                <span>📈</span> Bull Case
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Reported revenue growth accelerated in the supplied transcript</li>
                <li>• Management described demand as exceeding current capacity</li>
                <li>• Guidance was raised relative to the transcript&apos;s prior range</li>
              </ul>
            </div>

            <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
              <div className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                <span>📉</span> Bear Case
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• One segment declined year over year</li>
                <li>• Export restrictions were described as a material risk</li>
                <li>• Margin guidance was below the estimate quoted in the transcript</li>
              </ul>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
            <div className="text-zinc-400 font-semibold mb-2">⚡ Trade Thesis</div>
            <p className="text-white text-sm">
              Illustrative synthesis: demand commentary was constructive, while margin and regulatory
              risks warrant verification before any investment decision.
            </p>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Fictional sample output - not a factual company analysis or recommendation
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
            { step: '2', title: 'Model drafts', desc: 'Gemini, called through OpenRouter, extracts candidate points from the supplied text.' },
            { step: '3', title: 'Verify the draft', desc: 'Check each extracted metric and interpretation against the source transcript before relying on it.' },
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

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 mb-24 text-center">
        <div className="bg-gradient-to-r from-green-400/10 to-emerald-400/5 border border-green-400/20 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">
            Turn long transcripts into a review checklist.
            <br />
            Keep the source in the loop.
          </h2>
          <p className="text-gray-400 mb-8">
            Model output can be incomplete or wrong. Treat it as a draft, not investment advice.
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
