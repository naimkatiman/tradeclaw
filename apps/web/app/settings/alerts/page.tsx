import type { Metadata } from 'next';
import UnifiedAlertSetup from './UnifiedAlertSetup';

export const metadata: Metadata = {
  title: 'Alert Rules — TradeClaw',
  description: 'Configure signal alerts for Telegram, Discord, and Email from one screen.',
};

export default function AlertSettingsPage() {
  return <UnifiedAlertSetup />;
}
