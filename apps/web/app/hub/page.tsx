import { HubClient } from './HubClient';

export const metadata = {
  title: 'Docker Hub — TradeClaw',
  description:
    'Pull the official TradeClaw Docker image and self-host in seconds. Supports linux/amd64 and linux/arm64 (Apple Silicon).',
  openGraph: {
    title: 'TradeClaw on Docker Hub',
    description:
      'docker pull tradeclaw/tradeclaw — one-command self-hosting for your AI trading signal platform.',
  },
};

export default function HubPage() {
  return <HubClient />;
}
