import type { Metadata } from 'next';
import ApiKeysClient from './ApiKeysClient';

export const metadata: Metadata = {
  title: 'API Keys — TradeClaw',
  description:
    'Get a free TradeClaw API key. 1,000 requests/hour. Access real-time trading signals, leaderboard, and screener endpoints programmatically.',
};

export default function ApiKeysPage() {
  return <ApiKeysClient />;
}
