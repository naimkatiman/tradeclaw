import type { Metadata } from 'next';
import TelegramDemoClient from './TelegramDemoClient';

export const metadata: Metadata = {
  title: 'Live Telegram Demo | TradeClaw',
  description:
    'Enter your Telegram chat ID and get a live trading signal instantly from the TradeClaw bot. Free, no login required.',
  openGraph: {
    title: 'Live Telegram Demo | TradeClaw',
    description: 'Receive a real live trading signal on Telegram in seconds.',
    url: 'https://tradeclaw.win/demo/telegram',
  },
};

export default function TelegramDemoPage() {
  return <TelegramDemoClient />;
}
