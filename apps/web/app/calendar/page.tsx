import type { Metadata } from 'next';
import { CalendarClient } from './CalendarClient';

export const metadata: Metadata = {
  title: 'Signal Calendar — Daily Accuracy Heatmap | TradeClaw',
  description: 'GitHub-style contribution heatmap showing TradeClaw signal accuracy by day. Green = high win rate days, red = low. Visual proof of signal quality.',
  openGraph: {
    title: 'Signal Calendar — Daily Accuracy Heatmap',
    description: 'See our trading signal accuracy visualized as a GitHub-style heatmap. Real daily win rates.',
    url: 'https://tradeclaw.win/calendar',
  },
};

export default function CalendarPage() {
  return <CalendarClient />;
}
