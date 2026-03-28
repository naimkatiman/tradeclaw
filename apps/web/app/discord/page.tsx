import { DiscordClient } from './DiscordClient';

export const metadata = {
  title: 'Discord Bot — TradeClaw',
  description: 'Add the TradeClaw Discord bot to your server for live trading signals, slash commands, and auto-broadcast.',
};

export default function DiscordPage() {
  return <DiscordClient />;
}
