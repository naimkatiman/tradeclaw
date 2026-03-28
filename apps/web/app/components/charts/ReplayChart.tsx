'use client';

import { useCallback, useEffect, useRef } from 'react';
import { type IChartApi, type ISeriesApi, LineStyle } from 'lightweight-charts';
import LWChart from './LWChart';
import { useChartTheme } from './use-chart-theme';
import type { OHLCVBar } from './types';

interface ReplayChartProps {
  bars: OHLCVBar[];
  visibleCount: number;
  signal: {
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    tp1?: number;
    sl?: number;
  };
  height?: number;
}

export default function ReplayChart({ bars, visibleCount, signal, height = 400 }: ReplayChartProps) {
  const theme = useChartTheme();
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartApiRef = useRef<IChartApi | null>(null);

  const onChartReady = useCallback(
    (chart: IChartApi) => {
      chartApiRef.current = chart;

      const candleSeries = chart.addCandlestickSeries({
        upColor: theme.upColor,
        downColor: theme.downColor,
        wickUpColor: theme.wickUpColor,
        wickDownColor: theme.wickDownColor,
        borderVisible: false,
      });
      candleRef.current = candleSeries;

      const volumeSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      volumeRef.current = volumeSeries;

      // Price lines
      if (signal.tp1) {
        candleSeries.createPriceLine({
          price: signal.tp1,
          color: theme.upColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'TP',
        });
      }
      if (signal.sl) {
        candleSeries.createPriceLine({
          price: signal.sl,
          color: theme.downColor,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'SL',
        });
      }
      candleSeries.createPriceLine({
        price: signal.entryPrice,
        color: signal.direction === 'BUY' ? theme.upColor : theme.downColor,
        lineWidth: 1,
        lineStyle: LineStyle.LargeDashed,
        axisLabelVisible: true,
        title: 'Entry',
      });
    },
    [theme, signal],
  );

  // Update visible data when visibleCount changes
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volumeRef.current;
    if (!candle || !vol) return;

    const visible = bars.slice(0, visibleCount);
    candle.setData(visible);
    vol.setData(
      visible.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? theme.volumeUpColor : theme.volumeDownColor,
      })),
    );

    // Signal entry marker at bar index 30
    const signalBarIdx = Math.min(30, visible.length - 1);
    if (visibleCount > 30 && visible[signalBarIdx]) {
      candle.setMarkers([
        {
          time: visible[signalBarIdx].time,
          position: signal.direction === 'BUY' ? 'belowBar' : 'aboveBar',
          color: signal.direction === 'BUY' ? theme.upColor : theme.downColor,
          shape: signal.direction === 'BUY' ? 'arrowUp' : 'arrowDown',
          text: signal.direction,
        },
      ]);
    }

    // Keep live edge visible
    chartApiRef.current?.timeScale().scrollToPosition(2, false);
  }, [bars, visibleCount, signal, theme]);

  return <LWChart theme={theme} height={height} onChartReady={onChartReady} />;
}
