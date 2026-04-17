import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed Signals — TradeClaw',
  description: 'Embed live AI trading signals into your blog, Substack, or site with a single script tag.',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
