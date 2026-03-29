import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why Self-Hosting Your Trading Tools Is Worth It | TradeClaw Blog',
  description: 'SaaS trading tools charge $50-500/month. TradeClaw is free and runs on $5/month. What you gain, what you give up, and how to set it up in 10 minutes.',
  openGraph: {
    title: 'Why Self-Hosting Your Trading Tools Is Worth It',
    description: 'Free alternatives to expensive SaaS trading tools. Self-host TradeClaw on a $5/month VPS with Docker.',
  },
  keywords: ['self-host trading tools', 'open source trading platform', 'TradeClaw Docker', 'free trading signals', 'self-hosted finance'],
};

export default function SelfHostingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/blog" className="text-xs text-zinc-400 hover:text-white transition-colors">← Blog</Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex gap-2 mb-4">
          {['Self-Hosting', 'Docker', 'Open Source'].map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          Why Self-Hosting Your Trading Tools Is Worth It
        </h1>

        <div className="text-sm text-zinc-400 mb-8">March 25, 2026 · 10 min read</div>

        <div className="prose prose-invert prose-zinc max-w-none space-y-6 text-sm leading-7">

          <p className="text-base text-zinc-300">
            The SaaS trading tool market charges a premium for convenience. TradingView Pro is $15/month. 3Commas starts at $29/month. Cryptohopper, Coinrule, Altrady — all $50–150/month for the features that actually matter. For active traders, the annual cost adds up fast.
          </p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">The Cost Comparison</h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="px-4 py-2 text-left font-normal">Tool</th>
                  <th className="px-4 py-2 text-right font-normal">Monthly</th>
                  <th className="px-4 py-2 text-right font-normal">Annual</th>
                  <th className="px-4 py-2 text-left font-normal">What you lose without paying</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {[
                  ['TradingView Pro', '$15', '$180', 'Multiple indicators, alerts'],
                  ['3Commas Advanced', '$49', '$588', 'Smart trading, signals'],
                  ['Cryptohopper Hero', '$107', '$1,284', 'Strategy backtesting'],
                  ['TradeClaw (self-hosted)', '$5', '$60', 'Just your VPS cost'],
                ].map(([tool, mo, yr, note]) => (
                  <tr key={tool} className={`border-b border-zinc-800/50 ${tool.includes('TradeClaw') ? 'bg-emerald-500/5' : ''}`}>
                    <td className={`px-4 py-2 ${tool.includes('TradeClaw') ? 'text-emerald-400 font-medium' : ''}`}>{tool}</td>
                    <td className={`px-4 py-2 text-right ${tool.includes('TradeClaw') ? 'text-emerald-400' : 'text-red-400'}`}>{mo}</td>
                    <td className={`px-4 py-2 text-right ${tool.includes('TradeClaw') ? 'text-emerald-400' : 'text-red-400'}`}>{yr}</td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">What You Get with Self-Hosting</h2>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
            <li><strong className="text-white">Full data ownership</strong> — your signals, your history, on your machine. No vendor lock-in.</li>
            <li><strong className="text-white">Customisable</strong> — change the scoring weights, add indicators, modify thresholds. The code is yours.</li>
            <li><strong className="text-white">No rate limits</strong> — self-hosted means as many signals, backtests, and screener scans as your server handles.</li>
<<<<<<< HEAD
            <li><strong className="text-white">Privacy</strong> — your trading activity doesn't touch someone else's servers.</li>
=======
            <li><strong className="text-white">Privacy</strong> — your trading activity doesn&apos;t touch someone else&apos;s servers.</li>
>>>>>>> origin/main
            <li><strong className="text-white">Free API access</strong> — plug your own apps into <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-emerald-300">/api/v1/signals</code> without paying for API access.</li>
          </ul>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">What You Give Up</h2>
          <p className="text-zinc-300">Be honest with yourself here:</p>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
<<<<<<< HEAD
            <li><strong className="text-white">Maintenance</strong> — you're responsible for updates, uptime, and backups. Minimal, but real.</li>
=======
            <li><strong className="text-white">Maintenance</strong> — you&apos;re responsible for updates, uptime, and backups. Minimal, but real.</li>
>>>>>>> origin/main
            <li><strong className="text-white">Support</strong> — no customer service team. GitHub issues and community.</li>
            <li><strong className="text-white">Mobile apps</strong> — TradeClaw is a web app. No dedicated iOS/Android app yet.</li>
            <li><strong className="text-white">Broker integrations</strong> — no one-click IBKR or Binance trading from TradeClaw (yet). Signals only.</li>
          </ul>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">10-Minute Setup</h2>
          <p className="text-zinc-300">Three options, in order of simplicity:</p>

          <h3 className="font-semibold text-white mt-4 mb-2">Option 1: Docker Compose (recommended)</h3>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 text-xs text-zinc-400 font-mono">shell</div>
            <pre className="p-4 text-xs text-zinc-300 font-mono">{`git clone https://github.com/naimkatiman/tradeclaw
cd tradeclaw
cp .env.example .env  # edit if needed
docker compose up -d  # done`}</pre>
          </div>
<<<<<<< HEAD
          <p className="text-zinc-400">That's it. Open <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-emerald-300">http://localhost:3000</code> and you have a running signal dashboard.</p>
=======
          <p className="text-zinc-400">That&apos;s it. Open <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded text-emerald-300">http://localhost:3000</code> and you have a running signal dashboard.</p>
>>>>>>> origin/main

          <h3 className="font-semibold text-white mt-4 mb-2">Option 2: One-click Railway deploy</h3>
          <p className="text-zinc-400">Click the Railway deploy button in the README. It provisions a container, sets env vars, and gives you a public URL. Free tier works for personal use.</p>

          <h3 className="font-semibold text-white mt-4 mb-2">Option 3: npx demo (test first)</h3>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 font-mono text-xs text-zinc-300">
            npx tradeclaw-demo
          </div>
          <p className="text-zinc-400">Runs a local Bloomberg-style demo in your browser with zero installation.</p>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Recommended Hosting</h2>
          <ul className="space-y-2 text-zinc-400 list-disc list-inside">
            <li><strong className="text-white">Hetzner CX22</strong> (~€4/month) — best price/performance for EU</li>
            <li><strong className="text-white">DigitalOcean Droplet ($6/month)</strong> — simple, good docs</li>
            <li><strong className="text-white">Railway ($5/month)</strong> — one-click, no VPS management</li>
            <li><strong className="text-white">Render (free tier)</strong> — fine for testing, limited uptime</li>
          </ul>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mt-6">
            <p className="text-zinc-300 text-sm">
              <strong className="text-white">TradeClaw is free, MIT licensed, and self-hostable.</strong> If you want to help improve it, the repo is on GitHub. If you want a managed hosted version, that will be available soon via Alpha Screener.
            </p>
            <a href="https://github.com/naimkatiman/tradeclaw" className="text-emerald-400 hover:underline text-sm mt-2 inline-block" target="_blank" rel="noreferrer">
              Star on GitHub →
            </a>
          </div>

          <div className="border-t border-zinc-800 pt-6 mt-8">
            <p className="text-zinc-400 text-xs">
              <Link href="/docs/deployment" className="text-emerald-400 hover:underline">Full deployment docs</Link>
              {' '}· <Link href="/compare" className="text-emerald-400 hover:underline">Compare TradeClaw vs alternatives</Link>
              {' '}· <Link href="/api-docs" className="text-emerald-400 hover:underline">API reference</Link>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
