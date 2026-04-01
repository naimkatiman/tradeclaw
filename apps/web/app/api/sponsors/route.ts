import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 300; // 5 minutes

// Seeded mock sponsors since GitHub Sponsors GraphQL requires auth
const MOCK_SPONSORS = [
  {
    id: 'sp-001',
    login: 'alex_quant',
    name: 'Alex Chen',
    avatarUrl: '',
    tier: 'Champion',
    amount: 20,
    since: '2026-02-01',
    message: 'This is the trading tool I wish existed 5 years ago.',
  },
  {
    id: 'sp-002',
    login: 'sarah_trades',
    name: 'Sarah K.',
    avatarUrl: '',
    tier: 'Supporter',
    amount: 5,
    since: '2026-02-15',
    message: '',
  },
  {
    id: 'sp-003',
    login: 'devtrader99',
    name: 'Marcus L.',
    avatarUrl: '',
    tier: 'Supporter',
    amount: 5,
    since: '2026-03-01',
    message: 'Great OSS project. Keep building!',
  },
  {
    id: 'sp-004',
    login: 'fintech_fan',
    name: 'Priya M.',
    avatarUrl: '',
    tier: 'Community',
    amount: 1,
    since: '2026-03-10',
    message: '',
  },
  {
    id: 'sp-005',
    login: 'algo_wolf',
    name: 'James R.',
    avatarUrl: '',
    tier: 'Community',
    amount: 1,
    since: '2026-03-20',
    message: 'Love the signal engine transparency.',
  },
];

const TIERS = [
  {
    name: 'Community',
    amount: 1,
    color: 'blue',
    perks: [
      'Name in SPONSORS.md',
      'Community Discord role',
      'Priority issue responses',
    ],
    sponsorCount: MOCK_SPONSORS.filter((s) => s.tier === 'Community').length,
  },
  {
    name: 'Supporter',
    amount: 5,
    color: 'emerald',
    perks: [
      'Everything in Community',
      'Supporter badge on profile',
      'Early access to new features',
      'Monthly dev update email',
    ],
    sponsorCount: MOCK_SPONSORS.filter((s) => s.tier === 'Supporter').length,
  },
  {
    name: 'Champion',
    amount: 20,
    color: 'purple',
    perks: [
      'Everything in Supporter',
      'Champion badge + avatar wall',
      'Feature request priority queue',
      'Direct chat with maintainer',
      'Logo on README & website',
    ],
    sponsorCount: MOCK_SPONSORS.filter((s) => s.tier === 'Champion').length,
  },
];

const GOALS = [
  {
    amount: 50,
    label: 'Monthly blog post',
    description: 'A deep-dive technical post every month on signal algorithms, market analysis, and trading systems.',
  },
  {
    amount: 100,
    label: 'Hosted demo instance',
    description: 'A permanently live demo at demo.tradeclaw.win — zero-setup for evaluators.',
  },
  {
    amount: 200,
    label: 'Real broker API integration',
    description: 'Full live trading via Alpaca and Binance — paper trading to real execution in one click.',
  },
  {
    amount: 500,
    label: 'Full-time maintenance',
    description: 'Weekly releases, test suite, security audits, and 24h issue response SLA.',
  },
];

const totalMrr = MOCK_SPONSORS.reduce((sum, s) => sum + s.amount, 0);

export async function GET() {
  return NextResponse.json(
    {
      sponsors: MOCK_SPONSORS,
      tiers: TIERS,
      goals: GOALS,
      stats: {
        totalSponsors: MOCK_SPONSORS.length,
        monthlyRevenue: totalMrr,
        githubUrl: 'https://github.com/sponsors/naimkatiman',
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
