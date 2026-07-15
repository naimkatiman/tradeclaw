import type { Metadata } from 'next';
import { GHActionClient } from './GHActionClient';

export const metadata: Metadata = {
  title: 'TradeClaw GitHub Action — Signal Snapshots in CI/CD',
  description:
    'Fetch the latest available rule-generated signal candidates in a GitHub Actions workflow for logging or research.',
  openGraph: {
    title: 'TradeClaw GitHub Action — Signal Snapshots in CI/CD',
    description:
      'Archive the latest available TradeClaw signal candidates in a scheduled workflow.',
    type: 'website',
  },
};

export default function GithubActionPage() {
  return <GHActionClient />;
}
