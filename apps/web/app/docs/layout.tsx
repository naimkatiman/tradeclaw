import type { Metadata } from 'next';
import { DocsSidebar } from './components/docs-sidebar';

export const metadata: Metadata = {
  title: {
    template: '%s — TradeClaw Docs',
    default: 'TradeClaw Documentation',
  },
  description: 'Complete guides for TradeClaw — deployment, configuration, API reference, plugin development, and more.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#050505]">
      <DocsSidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
