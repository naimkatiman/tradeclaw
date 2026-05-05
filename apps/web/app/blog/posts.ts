export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
}

export const POSTS: BlogPost[] = [
  {
    slug: 'rsi-explained',
    title: 'RSI Explained: The Math Behind the Most Popular Trading Indicator',
    excerpt:
      "Relative Strength Index is on every trader's screen. But how does it actually work? We break down Wilder's formula, implementation in TypeScript, and when it actually generates useful signals.",
    date: '2026-03-20',
    readTime: '8 min',
    tags: ['RSI', 'Technical Analysis', 'Indicators'],
  },
  {
    slug: 'how-we-score-signals',
    title: 'How TradeClaw Scores Trading Signals: A Full Walkthrough',
    excerpt:
      "We built an open-source signal scoring engine from scratch. Here's exactly how it works — indicator weights, quality gates, confidence calibration, and why we chose these specific rules.",
    date: '2026-03-22',
    readTime: '12 min',
    tags: ['Algorithm', 'Signal Scoring', 'Open Source'],
  },
  {
    slug: 'self-hosting-trading-tools',
    title: 'Why Self-Hosting Your Trading Tools Is Worth It',
    excerpt:
      'SaaS trading tools charge $50–500/month. TradeClaw is free, open-source, and runs on $5/month VPS. Here\'s what you get, what you give up, and how to set it up in 10 minutes.',
    date: '2026-03-25',
    readTime: '10 min',
    tags: ['Self-Hosting', 'Docker', 'Open Source'],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getOtherPosts(slug: string, limit = 2): BlogPost[] {
  return POSTS.filter((p) => p.slug !== slug).slice(0, limit);
}

export function formatPostDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
