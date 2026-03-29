import { Metadata } from 'next';
import PineImportClient from './PineImportClient';

export const metadata: Metadata = {
  title: 'Pine Script to TradeClaw Converter | Free TradingView Strategy Importer',
  description:
    'Convert TradingView Pine Script strategies to TradeClaw JSON format instantly. Supports RSI, EMA, MACD, Bollinger Bands, Stochastic and more. Free, open-source, no sign-up required.',
  openGraph: {
    title: 'Pine Script to TradeClaw Converter | Free TradingView Strategy Importer',
    description:
      'Paste your Pine Script code and get an equivalent TradeClaw strategy JSON in seconds. Supports v4/v5 syntax.',
  },
};

export default function PineToTradeclawPage() {
  return <PineImportClient />;
}
