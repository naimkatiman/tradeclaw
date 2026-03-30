import type { Metadata } from 'next';
import { PostThreadClient } from './PostThreadClient';

export const metadata: Metadata = {
  title: 'Post TradeClaw Thread — X/Twitter Viral Thread Poster',
  description:
    'Pre-written 7-tweet viral threads for X/Twitter. Open all tweets in tabs at once, copy individual tweets, and schedule for max reach. TradeClaw architecture, self-hosting, signal engine, and launch threads.',
  openGraph: {
    title: 'Post TradeClaw Thread — Viral Thread Poster',
    description:
      'One-click tweet thread poster for TradeClaw. Architecture, self-hosting, signal engine, and launch threads ready to post.',
    type: 'website',
  },
};

export default function PostThreadPage() {
  return <PostThreadClient />;
}
