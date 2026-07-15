import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Embed Signals — TradeClaw',
  description: 'Embed the latest available read-only TradeClaw rule output in a site with a script tag.',
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
