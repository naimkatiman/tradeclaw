import type { Metadata } from 'next';
import StartLoader from './StartLoader';

export const metadata: Metadata = {
  title: 'Get Started — TradeClaw',
  description: 'Interactive setup guide for cloning, configuring, and running TradeClaw on your own infrastructure.',
  openGraph: {
    title: 'Get Started with TradeClaw in 5 Steps',
    description: 'Clone, configure, and run the open-source TradeClaw signal research stack.',
    images: [{ url: '/api/og', width: 1200, height: 630 }],
  },
};

export default function StartPage() {
  return <StartLoader />;
}
