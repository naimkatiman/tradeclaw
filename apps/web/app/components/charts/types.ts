import type { UTCTimestamp } from 'lightweight-charts';

export interface OHLCVBar {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalMarkerData {
  time: UTCTimestamp;
  direction: 'BUY' | 'SELL';
  label?: string;
}

export interface PriceLineData {
  price: number;
  color: string;
  title: string;
  lineStyle?: number; // 0=solid, 1=dotted, 2=dashed, 3=large-dashed
  lineWidth?: number;
}

export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  upColor: string;
  downColor: string;
  wickUpColor: string;
  wickDownColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
  crosshairColor: string;
}
