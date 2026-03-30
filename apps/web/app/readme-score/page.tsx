import type { Metadata } from 'next';
import { ReadmeScoreClient } from './ReadmeScoreClient';

export const metadata: Metadata = {
  title: 'README Score — Grade Your GitHub Repo | TradeClaw',
  description: 'Free tool to grade any GitHub repository README quality. Checks for demo GIFs, badges, install instructions, contributing guide, and star CTA.',
  openGraph: {
    title: 'README Score — Grade Your GitHub README Quality',
    description: 'Free viral dev tool. Paste any GitHub repo URL and get an instant quality score with actionable tips.',
    url: 'https://tradeclaw.win/readme-score',
  },
};

export default function ReadmeScorePage() {
  return <ReadmeScoreClient />;
}
