import type { Metadata } from 'next';
import { CalibrationClient } from './CalibrationClient';

export const metadata: Metadata = {
  title: 'Confidence Calibration | TradeClaw',
  description: 'Compare indicator-agreement score bands with counted OHLCV-resolved outcomes. Missing samples remain unavailable and are not replaced with demo metrics.',
  openGraph: {
    title: 'Signal Confidence Calibration | TradeClaw',
    description: 'Score-band diagnostics from counted OHLCV-resolved records, excluding simulated and placeholder rows.',
  },
};

export default function CalibrationPage() {
  return <CalibrationClient />;
}
