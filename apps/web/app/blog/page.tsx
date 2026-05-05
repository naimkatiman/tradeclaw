import type { Metadata } from 'next';
import Link from 'next/link';
import { POSTS, formatPostDate } from './posts';

export const metadata: Metadata = {
  title: 'Blog | TradeClaw',
  description: 'Technical articles on algorithmic trading, signal generation, self-hosting, and open-source trading tools.',
  openGraph: {
    title: 'TradeClaw Blog — Algo Trading & Open Source',
    description: 'Deep dives on RSI, MACD, signal scoring, self-hosting trading tools, and building open-source fintech.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

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
              <span>{formatPostDate(post.date)}</span>
              <span>·</span>
              <span>{post.readTime} read</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
