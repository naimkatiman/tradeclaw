import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signal Alerts — TradeClaw',
  description: 'Manage your trading signal alerts. Get notified by Telegram, email, or webhook when setups match your criteria.',
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
