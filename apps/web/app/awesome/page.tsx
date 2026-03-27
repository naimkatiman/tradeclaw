import type { Metadata } from 'next';
import { AwesomeClient } from './AwesomeClient';

export const metadata: Metadata = {
  title: 'Awesome Lists — TradeClaw',
  description:
    'Help TradeClaw get listed on awesome-selfhosted, awesome-quant, awesome-trading, and awesome-nodejs. Track submission status and learn how to contribute.',
  openGraph: {
    title: 'Awesome Lists — TradeClaw',
    description:
      'Help TradeClaw get listed on the most popular open-source awesome-lists. Self-hosted, Docker, MIT license, demo available.',
    type: 'website',
  },
};

export default function AwesomePage() {
  return <AwesomeClient />;
}
