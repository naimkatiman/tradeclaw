import { DiscordClient } from './DiscordClient';

export const metadata = {
  title: 'Discord Bot — TradeClaw',
  description: 'Review the MIT-licensed TradeClaw Discord bot source, slash commands, and self-hosting configuration.',
};

export default function DiscordPage() {
  return <DiscordClient />;
}
