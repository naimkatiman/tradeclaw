import { Metadata } from 'next';
import ZapierClient from './ZapierClient';

export const metadata: Metadata = {
  title: 'Zapier Integration — TradeClaw',
  description: 'Connect TradeClaw trading signals to 6,000+ apps via Zapier. Automate Signal → Email, Google Sheets, Slack and more with ready-to-use Zap templates.',
  openGraph: {
    title: 'TradeClaw × Zapier — Automate Your Trading Signals',
    description: 'Connect live AI trading signals to any app. No-code automation with Zapier.',
  },
};

export default function ZapierPage() {
  return <ZapierClient />;
}
