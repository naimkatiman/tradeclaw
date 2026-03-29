import type { Metadata } from 'next';
import { ActionClient } from '../action/ActionClient';

export const metadata: Metadata = {
  title: 'TradeClaw GitHub Action — Live Trading Signals in CI/CD',
  description:
    'Fetch live AI trading signals in your GitHub Actions workflows. Gate deployments on market conditions, run scheduled signal checks, and get rich summaries.',
  openGraph: {
    title: 'TradeClaw GitHub Action — Live Trading Signals in CI/CD',
    description:
      'Fetch live AI trading signals in your GitHub Actions workflows. Gate deployments, scheduled checks, rich summaries.',
    type: 'website',
  },
};

export default function GithubActionPage() {
  return <ActionClient />;
}
