import type { Metadata } from 'next';
import { Navbar } from '../components/navbar';
import { FAQAccordion } from '../../components/landing/faq-accordion';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'FAQ | TradeClaw',
  description:
    'Answers to the common questions: is anything paywalled, how the AI signals work, live trading, deployment, and self-hosting.',
  openGraph: {
    title: 'FAQ | TradeClaw',
    description:
      'Is anything paywalled? How do the signals work? Can I self-host? The short answers, in one place.',
    url: 'https://tradeclaw.win/faq',
    siteName: 'TradeClaw',
    type: 'website',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'TradeClaw FAQ' }],
  },
  alternates: { canonical: 'https://tradeclaw.win/faq' },
};

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28">
        {/* The accordion renders the visual header; the h1 exists for
            document structure and SEO. */}
        <h1 className="sr-only">Frequently asked questions</h1>
        <FAQAccordion />
      </main>
    </>
  );
}
