import type { Metadata } from 'next';
import { ShowcaseClient } from '../../components/showcase/ShowcaseClient';

export const metadata: Metadata = {
  title: 'TradeClaw Example Workflows',
  description:
    'Illustrative self-hosting and signal-review workflows. The personas are examples, not customer testimonials or evidence of live usage.',
  openGraph: {
    title: 'TradeClaw Example Workflows',
    description:
      'Example workflows for evaluating the open-source project; no invented users, deployment times, or delivery guarantees.',
    type: 'website',
  },
};

export default function ShowcasePage() {
  return <ShowcaseClient />;
}
