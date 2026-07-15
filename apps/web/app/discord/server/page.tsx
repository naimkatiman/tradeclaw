import type { Metadata } from 'next';
import { DiscordServerClient } from './DiscordServerClient';

export const metadata: Metadata = {
  title: 'Join TradeClaw Discord Community',
  description:
    'Review the external TradeClaw Discord invite and the documented webhook setup. Invite and channel availability are not guaranteed.',
  openGraph: {
    title: 'TradeClaw Discord Community',
    description:
      'External Discord invite and webhook setup reference for TradeClaw.',
    url: 'https://tradeclaw.win/discord/server',
  },
};

export default function DiscordServerPage() {
  return <DiscordServerClient />;
}
