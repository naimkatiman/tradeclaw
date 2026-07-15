import { Metadata } from 'next';
import PineImportClient from './PineImportClient';

export const metadata: Metadata = {
  title: 'Pine Script to TradeClaw Draft Importer',
  description:
    'Heuristically translate selected Pine Script patterns into draft TradeClaw JSON. Review warnings and validate behavior before using the result.',
  openGraph: {
    title: 'Pine Script to TradeClaw Draft Importer',
    description:
      'Translate selected Pine Script patterns into draft TradeClaw JSON. The output is not guaranteed to be semantically equivalent.',
  },
};

export default function PineToTradeclawPage() {
  return <PineImportClient />;
}
