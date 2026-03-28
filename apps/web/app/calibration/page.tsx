import type { Metadata } from 'next';
import { CalibrationClient } from './CalibrationClient';

export const metadata: Metadata = {
  title: 'Confidence Calibration | TradeClaw',
  description: 'Does 80% confidence really mean 80% win rate? See how TradeClaw signal confidence aligns with actual outcomes.',
  openGraph: {
    title: 'Signal Confidence Calibration | TradeClaw',
    description: 'Transparent calibration analysis: do TradeClaw confidence scores predict actual win rates?',
  },
};

export default function CalibrationPage() {
  return <CalibrationClient />;
}
