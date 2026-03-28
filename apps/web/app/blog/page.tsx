import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | TradeClaw',
  description: 'Technical articles on algorithmic trading, signal generation, self-hosting, and open-source trading tools.',
  openGraph: {
    title: 'TradeClaw Blog — Algo Trading & Open Source',
    description: 'Deep dives on RSI, MACD, signal scoring, self-hosting trading tools, and building open-source fintech.',
  },
};

const POSTS = [
  {
    slug: 'rsi-explained',
    title: 'RSI Explained: The Math Behind the Most Popular Trading Indicator',
    excerpt: "Relative Strength Index is on every trader's screen. But how does it actually work? We break down Wilder's formula, implementation in TypeScript, and when it actually generates useful signals.",
    date: '2026-03-20',
    readTime: '8 min',
    tags: ['RSI', 'Technical Analysis', 'Indicators'],
  },
  {
    slug: 'how-we-score-signals',
    title: 'How TradeClaw Scores Trading Signals: A Full Walkthrough',
    excerpt: "We built an open-source signal scoring engine from scratch. Here's exactly how it works — indicator weights, quality gates, confidence calibration, and why we chose these specific rules.",
    date: '2026-03-22',
    readTime: '12 min',
    tags: ['Algorithm', 'Signal Scoring', 'Open Source'],
  },
  {
    slug: 'self-hosting-trading-tools',
    title: 'Why Self-Hosting Your Trading Tools Is Worth It',
    excerpt: "SaaS trading tools charge $50–500/month. TradeClaw is free, open-source, and runs on $5/month VPS. Here's what you get, what you give up, and how to set it up in 10 minutes.",
    date: '2026-03-25',
    readTime: '10 min',
    tags: ['Self-Hosting', 'Docker', 'Open Source'],
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-8">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-lg font-semibold">Blog</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Algo trading · Open source · Technical analysis</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="block bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {tag}
                </span>
              ))}
            </div>
            <h2 className="text-base font-semibold text-white group-hover:text-emerald-400 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">{post.excerpt}</p>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>·</span>
              <span>{post.readTime} read</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
