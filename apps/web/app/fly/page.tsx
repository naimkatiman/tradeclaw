import type { Metadata } from 'next';
import { FlyClient } from './FlyClient';

export const metadata: Metadata = {
  title: 'Deploy on Fly.io | TradeClaw',
  description:
    'Deploy TradeClaw — the open-source AI trading signal platform — on Fly.io in 3 steps. Scale-to-zero machines, auto HTTPS, ~$0–5/mo. Includes fly.toml config and step-by-step guide.',
  keywords: ['fly.io', 'deploy', 'trading signals', 'self-hosted', 'open source', 'tradeclaw', 'fly deploy'],
  openGraph: {
    title: 'Deploy TradeClaw on Fly.io — Scale-to-Zero Trading Signals',
    description: 'Self-host AI trading signals on Fly.io for ~$0–5/mo. 3-step deploy with fly.toml included.',
    url: 'https://tradeclaw.win/fly',
  },
  alternates: {
    canonical: 'https://tradeclaw.win/fly',
  },
};

export default function FlyPage() {
  return <FlyClient />;
}
