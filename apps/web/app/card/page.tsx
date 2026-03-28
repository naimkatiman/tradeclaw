import type { Metadata } from 'next';
import { CardClient } from './CardClient';

export const metadata: Metadata = {
  title: 'Signal Card Generator — TradeClaw',
  description:
    'Create a personalized AI trading signal card to share on Twitter, Discord, or Telegram. Show your friends you use open-source AI-powered signals.',
  openGraph: {
    title: 'Generate Your TradeClaw Signal Card',
    description:
      'Free AI trading signal cards. Pick your asset, get a live signal with confidence score, and share it on social media.',
    type: 'website',
  },
};

export default function CardPage() {
  return <CardClient />;
}
