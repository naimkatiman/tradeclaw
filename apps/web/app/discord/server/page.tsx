import type { Metadata } from 'next';
import { DiscordServerClient } from './DiscordServerClient';

export const metadata: Metadata = {
  title: 'Join TradeClaw Discord Community',
  description:
    'Join the TradeClaw Discord community. Get live trading signals, discuss strategies, get support, and be first to know about new features.',
  openGraph: {
    title: 'TradeClaw Discord Community',
    description:
      'Live signals, strategy discussions, and early access — join the TradeClaw Discord community.',
    url: 'https://tradeclaw.win/discord/server',
  },
};

export default function DiscordServerPage() {
  return <DiscordServerClient />;
}
