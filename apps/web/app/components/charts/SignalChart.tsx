'use client';

import { useCallback } from 'react';
import {
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type LineWidth,
} from 'lightweight-charts';
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
  signalTime?: number;
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
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: theme.upColor,
        downColor: theme.downColor,
        wickUpColor: theme.wickUpColor,
        wickDownColor: theme.wickDownColor,
        borderVisible: false,
      });
      candleSeries.setData(bars);

      const volumeSeries = chart.addSeries(HistogramSeries, {
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
          lineWidth: (l.lineWidth ?? 1) as LineWidth,
          lineStyle: l.lineStyle ?? LineStyle.Dashed,
          axisLabelVisible: true,
          title: l.title,
        });
      }

      // Signal marker
      const markerTime = signalTime ?? bars[Math.min(30, bars.length - 1)]?.time;
      if (markerTime) {
        createSeriesMarkers(candleSeries, [
          {
            time: markerTime as unknown as import('lightweight-charts').Time,
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
