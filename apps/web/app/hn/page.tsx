import type { Metadata } from 'next';
import { HNClient } from './HNClient';

export const metadata: Metadata = {
  title: 'HN Launch Kit — TradeClaw',
  description:
    'Everything you need to launch TradeClaw on Hacker News: optimized Show HN titles, body text, first comment template, submission checklist, and tips for maximum traction.',
};

export default function HNPage() {
  return <HNClient />;
}
