'use client';

import { useCallback } from 'react';
import { type IChartApi, LineStyle } from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar, PriceLineData } from './types';

interface SignalChartProps {
  bars: OHLCVBar[];
  direction: 'BUY' | 'SELL';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  signalTime?: number; // UTCTimestamp of signal entry
  height?: number;
}

export default function SignalChart({
  bars,
  direction,
  entry,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  signalTime,
  height = 400,
}: SignalChartProps) {
  const theme = useChartTheme();

  const onChartReady = useCallback(
    (chart: IChartApi) => {
      // Candlestick series
      const candleSeries = chart.addCandlestickSeries({
        upColor: theme.upColor,
        downColor: theme.downColor,
        wickUpColor: theme.wickUpColor,
        wickDownColor: theme.wickDownColor,
        borderVisible: false,
      });
      candleSeries.setData(bars);

      // Volume histogram
      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeSeries.setData(
        bars.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
        })),
      );

      // Price lines
      const lines: PriceLineData[] = [
        { price: entry, color: '#ffffff', title: 'Entry', lineStyle: LineStyle.Dashed, lineWidth: 1 },
        { price: stopLoss, color: theme.downColor, title: 'SL', lineStyle: LineStyle.Dashed, lineWidth: 1 },
        { price: takeProfit1, color: theme.upColor, title: 'TP1', lineStyle: LineStyle.Dashed, lineWidth: 1 },
      ];
      if (takeProfit2) lines.push({ price: takeProfit2, color: theme.upColor, title: 'TP2', lineStyle: LineStyle.Dotted, lineWidth: 1 });
      if (takeProfit3) lines.push({ price: takeProfit3, color: theme.upColor, title: 'TP3', lineStyle: LineStyle.Dotted, lineWidth: 1 });

      for (const l of lines) {
        candleSeries.createPriceLine({
          price: l.price,
          color: l.color,
          lineWidth: l.lineWidth ?? 1,
          lineStyle: l.lineStyle ?? LineStyle.Dashed,
          axisLabelVisible: true,
          title: l.title,
        });
      }

      // Signal marker
      const markerTime = signalTime ?? bars[Math.min(30, bars.length - 1)]?.time;
      if (markerTime) {
        candleSeries.setMarkers([
          {
            time: markerTime,
            position: direction === 'BUY' ? 'belowBar' : 'aboveBar',
            color: direction === 'BUY' ? theme.upColor : theme.downColor,
            shape: direction === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: direction,
          },
        ]);
      }

      chart.timeScale().fitContent();
    },
    [bars, direction, entry, stopLoss, takeProfit1, takeProfit2, takeProfit3, signalTime, theme],
  );

  return <LWChart theme={theme} height={height} onChartReady={onChartReady} />;
}
